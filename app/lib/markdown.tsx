import { marked, type Token, type Tokens } from 'marked'
import type { RemixNode } from 'remix/ui'

// 把 Markdown 渲染成 Remix UI 节点（而非注入 HTML 字符串）——
// 这是 remix/ui 下最安全、SSR 友好的做法。样式由文章页的 prose 容器
// 通过后代选择器统一负责，这里只产出语义元素。

export function renderMarkdown(body: string): RemixNode {
  const tokens = marked.lexer(body)
  return <>{renderBlocks(tokens)}</>
}

function renderBlocks(tokens: Token[]): RemixNode[] {
  return tokens.map((token, i) => renderBlock(token, i))
}

function renderBlock(token: Token, key: number): RemixNode {
  switch (token.type) {
    case 'heading': {
      const t = token as Tokens.Heading
      const children = renderInline(t.tokens)
      const id = slugifyHeading(t.text)
      switch (t.depth) {
        case 1:
          return <h1 key={key} id={id}>{children}</h1>
        case 2:
          return <h2 key={key} id={id}>{children}</h2>
        case 3:
          return <h3 key={key} id={id}>{children}</h3>
        case 4:
          return <h4 key={key} id={id}>{children}</h4>
        case 5:
          return <h5 key={key} id={id}>{children}</h5>
        default:
          return <h6 key={key} id={id}>{children}</h6>
      }
    }
    case 'paragraph': {
      const t = token as Tokens.Paragraph
      return <p key={key}>{renderInline(t.tokens)}</p>
    }
    case 'code': {
      const t = token as Tokens.Code
      return (
        <pre key={key} data-lang={t.lang || undefined}>
          <code>{t.text}</code>
        </pre>
      )
    }
    case 'blockquote': {
      const t = token as Tokens.Blockquote
      return <blockquote key={key}>{renderBlocks(t.tokens)}</blockquote>
    }
    case 'list': {
      const t = token as Tokens.List
      const items = t.items.map((item, j) => (
        <li key={j}>{renderListItem(item)}</li>
      ))
      return t.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>
    }
    case 'hr':
      return <hr key={key} />
    case 'table': {
      const t = token as Tokens.Table
      return (
        <table key={key}>
          <thead>
            <tr>
              {t.header.map((cell, j) => (
                <th key={j}>{renderInline(cell.tokens)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c}>{renderInline(cell.tokens)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    case 'space':
      return <></>
    case 'html': {
      // 出于安全考虑，不渲染原始 HTML，按纯文本展示
      const t = token as Tokens.HTML
      return <></>
    }
    default: {
      const t = token as { tokens?: Token[]; text?: string }
      if (t.tokens) return <p key={key}>{renderInline(t.tokens)}</p>
      return <></>
    }
  }
}

function renderListItem(item: Tokens.ListItem): RemixNode {
  // 紧凑列表项的内容是 inline 的 text token；松散列表是 block。
  return <>{renderBlocks(item.tokens)}</>
}

function renderInline(tokens: Token[] | undefined): RemixNode[] {
  if (!tokens) return []
  return tokens.map((token, i) => renderInlineToken(token, i))
}

function renderInlineToken(token: Token, key: number): RemixNode {
  switch (token.type) {
    case 'text': {
      const t = token as Tokens.Text
      return t.tokens ? <>{renderInline(t.tokens)}</> : t.text
    }
    case 'strong':
      return <strong key={key}>{renderInline((token as Tokens.Strong).tokens)}</strong>
    case 'em':
      return <em key={key}>{renderInline((token as Tokens.Em).tokens)}</em>
    case 'del':
      return <del key={key}>{renderInline((token as Tokens.Del).tokens)}</del>
    case 'codespan':
      return <code key={key}>{(token as Tokens.Codespan).text}</code>
    case 'br':
      return <br key={key} />
    case 'link': {
      const t = token as Tokens.Link
      const external = /^https?:\/\//.test(t.href)
      return (
        <a
          key={key}
          href={t.href}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {renderInline(t.tokens)}
        </a>
      )
    }
    case 'image': {
      const t = token as Tokens.Image
      return <img key={key} src={t.href} alt={t.text} title={t.title || undefined} />
    }
    case 'escape':
      return (token as Tokens.Escape).text
    default: {
      const t = token as { text?: string }
      return t.text ?? ''
    }
  }
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
}
