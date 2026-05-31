import type { Handle } from 'remix/ui'

import { projectGroups, type Project } from '../lib/projects.ts'
import { site } from '../lib/site.ts'
import { Layout } from './layout.tsx'

export function ProjectsPage() {
  return () => (
    <Layout title={`项目 · ${site.title}`} description="Casper 做的产品、平台与开源工具。">
      <section class="page-head">
        <h1 class="page-title">项目</h1>
        <p class="page-sub">在做的产品、平台，以及开源出来的小工具。</p>
      </section>

      {projectGroups.length === 0 ? (
        <p class="empty-note">精选项目正在整理中，很快放上来。</p>
      ) : (
        projectGroups.map((group, i) => (
          <div key={i}>
            <div class="section-label">{group.label}</div>
            <ul class="posts">
              {group.items.map((proj, j) => (
                <li key={j}>
                  <ProjectRow proj={proj} />
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </Layout>
  )
}

function ProjectRow(handle: Handle<{ proj: Project }>) {
  return () => {
    const { proj } = handle.props
    const inner = (
      <>
        <div class="proj-head">
          <span class="proj-name">{proj.name}</span>
          {proj.private && <span class="proj-tag">私有</span>}
        </div>
        <p class="proj-desc">{proj.desc}</p>
      </>
    )
    return proj.url ? (
      <a class="proj" href={proj.url} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    ) : (
      <div class="proj proj-static">{inner}</div>
    )
  }
}
