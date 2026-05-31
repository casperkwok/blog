import type { Handle, RemixNode } from 'remix/ui'

import { site } from '../lib/site.ts'

export interface DocumentProps {
  children?: RemixNode
  head?: RemixNode
  title?: string
  description?: string
  /** 相对路径或绝对 URL；用于 canonical / og:url */
  path?: string
}

const JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: site.title,
  url: site.url,
  description: site.description,
  author: { '@type': 'Person', name: site.author },
})

export function Document(handle: Handle<DocumentProps>) {
  return () => {
    let {
      children,
      head,
      title = site.title,
      description = site.description,
      path = '/',
    } = handle.props

    const canonical = path.startsWith('http') ? path : site.url + path

    return (
      <html lang="zh-CN">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="color-scheme" content="light" />
          <meta name="robots" content="index, follow" />
          <meta name="description" content={description} />
          <link rel="canonical" href={canonical} />

          <meta property="og:type" content="website" />
          <meta property="og:site_name" content={site.title} />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={description} />
          <meta property="og:url" content={canonical} />

          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content={title} />
          <meta name="twitter:description" content={description} />

          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <link rel="alternate" type="application/rss+xml" title={site.title} href="/rss.xml" />
          {/* render-blocking 真实样式表 → 首屏即有样式，无 FOUC */}
          <link rel="stylesheet" href="/styles.css" />
          <title>{title}</title>
          <script type="application/ld+json">{JSON_LD}</script>
          {head}
        </head>
        <body>{children}</body>
      </html>
    )
  }
}
