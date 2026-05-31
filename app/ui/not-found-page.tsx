import { site } from '../lib/site.ts'
import { Layout } from './layout.tsx'

export function NotFoundPage() {
  return () => (
    <Layout title={`404 · ${site.title}`}>
      <div class="nf">
        <p class="nf-code">404</p>
        <p>这篇文章不存在或已被移动。</p>
        <a class="back" href="/">
          ← 返回首页
        </a>
      </div>
    </Layout>
  )
}
