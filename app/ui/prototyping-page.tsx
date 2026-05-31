import { site } from '../lib/site.ts'
import { Layout } from './layout.tsx'

export function PrototypingPage() {
  return () => (
    <Layout
      title={`原型 · ${site.title}`}
      description="把想法快速做成能跑的原型与小实验。"
    >
      <section class="page-head">
        <h1 class="page-title">原型</h1>
        <p class="page-sub">把想法快速做成能跑的原型、Demo 与小实验。</p>
      </section>

      <p class="empty-note">原型正在整理中，很快放上来。</p>
    </Layout>
  )
}
