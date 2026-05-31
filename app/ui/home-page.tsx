import type { Handle } from 'remix/ui'

import type { PostMeta } from '../lib/posts.ts'
import { site } from '../lib/site.ts'
import { Layout } from './layout.tsx'

export interface HomePageProps {
  posts: PostMeta[]
}

export function HomePage(handle: Handle<HomePageProps>) {
  return () => {
    const { posts } = handle.props
    return (
      <Layout>
        <section class="intro">
          <p>
            嗨，我是 {site.author}。产品经理，也在做 AI agent 平台、独立做产品，重度使用 Claude
            Code。这里记录我在 AI、产品与工程路上的笔记和思考。
          </p>
          <p>
            在 <a href={site.links.github} target="_blank" rel="noopener noreferrer">GitHub</a>{' '}
            找到我，或订阅 <a href="/rss.xml">RSS</a>。
          </p>
        </section>

        <div class="section-label">全部文章 · {posts.length}</div>
        {posts.length === 0 ? (
          <p class="intro">还没有文章。</p>
        ) : (
          <ul class="posts">
            {posts.map((post, i) => (
              <li key={i}>
                <PostRow post={post} />
              </li>
            ))}
          </ul>
        )}
      </Layout>
    )
  }
}

function PostRow(handle: Handle<{ post: PostMeta }>) {
  return () => {
    const { post } = handle.props
    return (
      <a class="post" href={`/posts/${post.slug}`}>
        <span class="post-date">{formatDate(post.date)}</span>
        <span class="post-title">
          {post.title}
          {post.status && <span class="status-tag">{post.status}</span>}
          {post.tags.length > 0 && (
            <span class="post-tags">{post.tags.map((t) => `#${t}`).join(' ')}</span>
          )}
        </span>
      </a>
    )
  }
}

function formatDate(date: string): string {
  // 2026-05-31 → 2026.05.31
  return date.replace(/-/g, '.')
}
