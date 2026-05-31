import { createAssetServer } from 'remix/assets'

const rootDir = process.cwd()
const isProd = process.env.NODE_ENV === 'production'

export const assetServer = createAssetServer({
  basePath: '/assets',
  rootDir,
  fileMap: {
    'app/*path': 'app/*path',
    'node_modules/*path': 'node_modules/*path',
  },
  allow: ['app/assets/**', 'node_modules/**'],
  deny: ['app/**/*.server.*'],
  sourceMaps: isProd ? undefined : 'external',
  // 生产：关闭 watch、压缩、用 buildId 指纹做长效不可变缓存。
  // 每次部署 BUILD_ID 变化即可让缓存失效（部署脚本里设置）。
  watch: !isProd,
  minify: isProd,
  fingerprint: isProd ? { buildId: process.env.BUILD_ID || String(Date.now()) } : undefined,
  scripts: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
    },
  },
})
