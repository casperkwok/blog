import type { Handle, RemixNode } from 'remix/ui'

import { site } from '../lib/site.ts'
import { Document } from './document.tsx'

export interface LayoutProps {
  children?: RemixNode
  title?: string
  description?: string
}

export function Layout(handle: Handle<LayoutProps>) {
  return () => {
    const { children, title, description } = handle.props
    return (
      <Document title={title} description={description}>
        <div class="site">
          <nav class="topbar">
            <a class="brand" href="/">
              {site.author}
            </a>
            <div class="nav">
              <a href="/">文章</a>
              <a href="/projects">项目</a>
              <a href="/prototyping">原型</a>
              <a href={site.links.github} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </div>
          </nav>
          {children}
          <Footer />
        </div>
      </Document>
    )
  }
}

function Footer() {
  return () => (
    <footer class="footer">
      <span>
        © {new Date().getFullYear()} {site.author}
      </span>
      <nav class="footer-nav">
        <a href="/rss.xml">订阅</a>
        <a href={site.links.github} target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <a href={site.links.email}>邮箱</a>
      </nav>
    </footer>
  )
}
