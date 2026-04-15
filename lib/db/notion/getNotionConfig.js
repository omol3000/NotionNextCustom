/**
 * 从Notion中读取站点配置;
 * 在Notion模板中创建一个类型为CONFIG的页面，再添加一个数据库表格，即可用于填写配置
 * Notion数据库配置优先级最高，将覆盖vercel环境变量以及blog.config.js中的配置
 * --注意--
 * 数据库请从模板复制 https://www.notion.so/tanghh/287869a92e3d4d598cf366bd6994755e
 *
 */
import { getDateValue, getTextContent } from 'notion-utils'
import { deepClone } from '../../utils'
import getAllPageIds from './getAllPageIds'
import { fetchNotionPageBlocks, fetchInBatches } from './getPostBlocks'
import { encryptEmail } from '@/lib/plugins/mailEncrypt'
import { normalizeNotionMetadata, normalizeCollection, normalizeSchema, normalizePageBlock } from './normalizeUtil'

/**
 * 从Notion中读取Config配置表
 * @param {*} allPages
 * @returns
 */
export async function getConfigMapFromConfigPage(allPages) {
  // 默认返回配置文件
  const notionConfig = {}

  if (!allPages || !Array.isArray(allPages) || allPages.length === 0) {
    console.warn('[Notion配置] 忽略的配置')
    return null
  }
  // 找到Config类
  const configPage = allPages?.find(post => {
    return (
      post &&
      post?.type &&
      (post?.type === 'CONFIG' ||
        post?.type === 'config' ||
        post?.type === 'Config')
    )
  })

  if (!configPage) {
    // console.warn('[Notion配置] 未找到配置页面')
    return null
  }
  const configPageId = configPage.id
  //   console.log('[Notion配置]请求配置数据 ', configPage.id)
  let pageRecordMap = await fetchNotionPageBlocks(configPageId, 'config-table')
  // 兼容新旧格式：normalizePageBlock 会自动剥离 value 包装层
  let configBlock = normalizePageBlock(pageRecordMap.block?.[configPageId]?.value ?? pageRecordMap.block?.[configPageId])
  let content = configBlock?.content
  for (const table of ['Config-Table', 'CONFIG-TABLE']) {
    if (content) break
    pageRecordMap = await fetchNotionPageBlocks(configPageId, table)
    configBlock = normalizePageBlock(pageRecordMap.block?.[configPageId]?.value ?? pageRecordMap.block?.[configPageId])
    content = configBlock?.content
  }

  if (!content) {
    console.warn('[Notion配置] 未找到配置表格 content, configBlock:', JSON.stringify(configBlock)?.slice(0, 200))
    return null
  }

  // 找到PAGE文件中的database
  const configTableId = content?.find(contentId => {
    const entry = pageRecordMap.block?.[contentId]
    const normalized = normalizePageBlock(entry?.value ?? entry)
    return normalized?.type === 'collection_view' || normalized?.type === 'collection_view_page'
  })

  // eslint-disable-next-line no-constant-condition, no-self-compare
  if (!configTableId) {
    // console.warn(
    //   '[Notion配置]未找到配置表格数据',
    //   pageRecordMap.block[configPageId],
    //   pageRecordMap.block[configPageId].value
    // )
    return null
  }

  // 页内查找数据表格
  const block = pageRecordMap.block || {}
  const rawMetadata = normalizePageBlock(pageRecordMap.block?.[configTableId]?.value ?? pageRecordMap.block?.[configTableId])
  // Check Type Page-Database和Inline-Database
  if (
    rawMetadata?.type !== 'collection_view_page' &&
    rawMetadata?.type !== 'collection_view'
  ) {
    console.error(`pageId "${configTableId}" is not a database`)
    return null
  }
  const collectionId = rawMetadata?.collection_id
  const collectionRaw = pageRecordMap.collection?.[collectionId]?.value ?? pageRecordMap.collection?.[collectionId]
  const collection = normalizeCollection(collectionRaw)
  const collectionQuery = pageRecordMap.collection_query
  const collectionView = pageRecordMap.collection_view
  const schema = normalizeSchema(collection?.schema || {})
  const viewIds = rawMetadata?.view_ids
  const initialPageIds = getAllPageIds(
    collectionQuery,
    collectionId,
    collectionView,
    viewIds
  )

  const pageIds = initialPageIds
  if (pageIds?.length === 0) {
    console.error('[Notion配置]获取到的文章列表为空，请检查notion模板')
  }

  // 补拉缺失的 block（Notion getPage 不一定返回所有行的 block）
  const missingBlockIds = pageIds.filter(id => {
    const b = normalizePageBlock(block[id]?.value ?? block[id])
    return !b || !b.properties
  })
  if (missingBlockIds.length > 0) {
    console.log(`[Notion配置] 需要补拉 ${missingBlockIds.length} 条缺失的配置行 block`)
    const extraBlocks = await fetchInBatches(missingBlockIds)
    // 合并补拉的 blocks
    for (const [id, val] of Object.entries(extraBlocks)) {
      block[id] = val
    }
  }
  // 遍历用户的表格
  let skippedNoBlock = 0
  let skippedNoProps = 0
  for (let i = 0; i < pageIds.length; i++) {
    const id = pageIds[i]
    const rawBlock = block[id]
    if (!rawBlock) {
      skippedNoBlock++
      continue
    }
    const temp = normalizePageBlock(rawBlock?.value ?? rawBlock)
    if (!temp) {
      skippedNoBlock++
      if (i >= pageIds.length - 10) {
        console.log(`[DEBUG] id=${id} normalizePageBlock returned null, raw keys:`, Object.keys(rawBlock || {}).join(','))
      }
      continue
    }
    if(!temp?.properties){
      skippedNoProps++
      if (i >= pageIds.length - 10) {
        console.log(`[DEBUG] id=${id} no properties, type=${temp.type}, keys:`, Object.keys(temp).join(','))
      }
      continue
    }
    const rawProperties = Object.entries(temp?.properties || [])
    const excludeProperties = ['date', 'select', 'multi_select', 'person']
    const properties = {}
    for (let i = 0; i < rawProperties.length; i++) {
      const [key, val] = rawProperties[i]
      properties.id = id
      if (schema[key]?.type && !excludeProperties.includes(schema[key].type)) {
        properties[schema[key].name] = getTextContent(val)
      } else {
        switch (schema[key]?.type) {
          case 'date': {
            const dateProperty = getDateValue(val)
            delete dateProperty.type
            properties[schema[key].name] = dateProperty
            break
          }
          case 'select':
          case 'multi_select': {
            const selects = getTextContent(val)
            if (selects[0]?.length) {
              properties[schema[key].name] = selects.split(',')
            }
            break
          }
          default:
            break
        }
      }
    }

    if (properties && typeof properties === 'object' && !Array.isArray(properties) && Object.keys(properties).length > 0) {
      // 将表格中的字段映射成 英文
      const config = {
        enable: (properties['启用'] || properties.Enable) === 'Yes',
        key: properties['配置名'] || properties.Name,
        value: properties['配置值'] || properties.Value
      }

      // 只导入生效的配置
      if (config.enable) {
        // console.log('[Notion配置]', config.key, config.value)
        if (config.key === 'CONTACT_EMAIL') {
          notionConfig[config.key] =
            (config.value && encryptEmail(config.value)) || null
        } else {
          notionConfig[config.key] =
            parseTextToJson(config.value) || config.value || null
          // 配置不能是undefined，至少是null
        }
      }
    }
  }

  console.log(`[Notion配置] pageIds: ${pageIds.length}, skippedNoBlock: ${skippedNoBlock}, skippedNoProps: ${skippedNoProps}, 已加载配置项数量: ${Object.keys(notionConfig).length}`)
  console.log('[Notion配置] 配置keys:', Object.keys(notionConfig).join(', '))
  let combine = notionConfig
  try {
    // 将INLINE_CONFIG合并，@see https://docs.tangly1024.com/article/notion-next-inline-config
    combine = Object.assign(
      {},
      deepClone(notionConfig),
      notionConfig?.INLINE_CONFIG
    )
  } catch (err) {
    console.warn('解析 INLINE_CONFIG 配置时出错,请检查JSON格式', err)
  }
  return combine
}

/**
 * 解析INLINE_CONFIG
 * @param {*} configString
 * @returns
 */
export function parseConfig(configString) {
  if (!configString) {
    return {}
  }
  // 解析对象
  try {
    // eslint-disable-next-line no-eval
    const config = eval('(' + configString + ')')
    return config
  } catch (evalError) {
    console.warn(
      '解析 eval(INLINE_CONFIG) 配置时出错,请检查JSON格式',
      evalError
    )
    return {}
  }
}

/**
 * 解析文本为JSON
 * @param text
 * @returns {any|null}
 */
export function parseTextToJson(text) {
  try {
    return JSON.parse(text)
  } catch (error) {
    return null
  }
}
