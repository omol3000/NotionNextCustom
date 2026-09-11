import BLOG from '@/blog.config'
import { clearCache } from '@/lib/cache/memory_cache'

/**
 * 按需重新验证（On-Demand Revalidation）
 *
 * 调用示例：
 *   /api/revalidate?secret=xxx&path=/de-DE/article/mein-slug
 *
 * 清空内存缓存后重新生成目标路径，以及首页（首页列出了文章）。
 * 必须配置环境变量 REVALIDATE_SECRET，否则接口直接拒绝。
 */
export default async function handler(req, res) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) {
    return res
      .status(500)
      .json({ status: 'error', message: 'REVALIDATE_SECRET is not configured' })
  }
  if (req.query.secret !== secret) {
    return res.status(401).json({ status: 'error', message: 'Invalid secret' })
  }

  // 只接受站内绝对路径：拒绝协议、协议相对 URL、查询串和锚点
  const raw = typeof req.query.path === 'string' ? req.query.path : '/'
  if (
    !raw.startsWith('/') ||
    raw.startsWith('//') ||
    raw.includes('?') ||
    raw.includes('#')
  ) {
    return res
      .status(400)
      .json({ status: 'error', message: 'path must be a site-relative path' })
  }
  const path = raw.length > 1 ? raw.replace(/\/+$/, '') : raw

  // 1. 内存缓存里还躺着旧的 site_ / page_block_ 数据，先清掉
  await clearCache()

  // 2. 目标路径 + 首页（带语言前缀的变体也一并处理）
  const targets = new Set([path, '/'])
  const locale = path.match(/^\/([a-z]{2}(?:-[A-Z]{2})?)(?:\/|$)/)
  if (locale) {
    targets.add(`/${locale[1]}`)
  } else if (BLOG.LANG) {
    targets.add(`/${BLOG.LANG}`)
  }

  const revalidated = {}
  for (const target of targets) {
    try {
      await res.revalidate(target)
      revalidated[target] = 'ok'
    } catch (e) {
      revalidated[target] = e?.message || String(e)
    }
  }

  const ok = revalidated[path] === 'ok'
  return res
    .status(ok ? 200 : 500)
    .json({ status: ok ? 'success' : 'error', path, revalidated })
}
