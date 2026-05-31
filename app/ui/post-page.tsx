import type { Handle } from 'remix/ui'

import { renderMarkdown } from '../lib/markdown.tsx'
import type { Post } from '../lib/posts.ts'
import { site } from '../lib/site.ts'
import { Layout } from './layout.tsx'

export interface PostPageProps {
  post: Post
}

export function PostPage(handle: Handle<PostPageProps>) {
  return () => {
    const { post } = handle.props
    const meta = [formatDate(post.date), ...post.tags].filter(Boolean).join('  ·  ')
    return (
      <Layout title={`${post.title} · ${site.title}`} description={post.summary}>
        <article>
          <header class="article-head">
            <div class="article-meta">{meta}</div>
            <h1 class="article-title">
              {post.title}
              {post.status && <span class="status-tag">{post.status}</span>}
            </h1>
          </header>
          {post.status && (
            <p class="draft-note">本文为{post.status}，思考仍在演化中，结论可能调整。</p>
          )}
          <div class="prose">{renderMarkdown(post.body)}</div>
        </article>

        <a class="back" href="/">
          ← 返回全部文章
        </a>
      </Layout>
    )
  }
}

function formatDate(date: string): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return `${d.getUTCFullYear()} 年 ${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日`
}
