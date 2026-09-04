/**
 * 是否静态导出；或ISR动态站点
 */
function isExport() {
  return process.env.EXPORT === 'true'
}

/**
 * 是否处于编译阶段（yarn build / yarn export）
 * 运行时（Vercel Serverless）文件系统只读，所有生成静态文件的任务
 * 在此阶段之外执行都是无用功，故用此判断跳过。
 */
function isBuildPhase() {
  return (
    process.env.npm_lifecycle_event === 'build' ||
    process.env.npm_lifecycle_event === 'export'
  )
}

module.exports = { isExport, isBuildPhase }
