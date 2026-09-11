import cache from 'memory-cache'
import BLOG from '@/blog.config'

// 生产环境只需在一次渲染内去重（fetchGlobalAllData 会重复取同一 pageId），
// 几秒即够。TTL 过长会让 /api/revalidate 之后的重新生成仍拿到旧 block。
const cacheTime = BLOG.isProd ? 60 : 120 * 60 // 开发 120 分钟；生产 60 秒

export async function getCache(key, options) {
  return await cache.get(key)
}

export async function setCache(key, data, customCacheTime) {
  await cache.put(key, data, (customCacheTime || cacheTime) * 1000)
}

export async function delCache(key) {
  await cache.del(key)
}

export async function clearCache() {
  await cache.clear()
}

export default { getCache, setCache, delCache, clearCache }
