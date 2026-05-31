import * as fs from 'node:fs'
import * as path from 'node:path'

// 启动时从 content/posts/*.md 读取全部文章并解析 frontmatter。
// frontmatter 形如：
//   ---
//   title: 标题
//   date: 2026-05-31
//   summary: 一句话摘要
//   tags: remix, blog
//   ---

export interface PostMeta {
  slug: string
  title: string
  date: string
  summary: string
  tags: string[]
  /** 可选状态标记，如「初稿」「连载中」；为空表示定稿 */
  status: string
}

export interface Post extends PostMeta {
  body: string
}

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts')

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  if (!match) return { data: {}, body: raw }

  const data: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    data[key] = value
  }
  return { data, body: match[2] }
}

function loadAll(): Post[] {
  let files: string[] = []
  try {
    files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'))
  } catch {
    return []
  }

  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8')
    const { data, body } = parseFrontmatter(raw)
    const slug = data.slug || file.replace(/\.md$/, '')
    return {
      slug,
      title: data.title || slug,
      date: data.date || '',
      summary: data.summary || '',
      tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      status: data.status || '',
      body,
    } satisfies Post
  })

  // 按日期倒序
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  return posts
}

// 开发模式下每次读盘（便于改文章即时生效）；生产读一次缓存。
let cache: Post[] | null = null
const isProd = process.env.NODE_ENV === 'production'

export function getAllPosts(): Post[] {
  if (isProd) {
    cache ??= loadAll()
    return cache
  }
  return loadAll()
}

export function getPost(slug: string): Post | undefined {
  return getAllPosts().find((p) => p.slug === slug)
}
