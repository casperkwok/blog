import type { RemixNode } from 'remix/ui'
import { renderToStream } from 'remix/ui/server'

// 把组件树渲染成 HTML 流响应。博客是纯静态内容，无 <Frame>、无 clientEntry，
// 所以不需要 resolveFrame / resolveClientEntry。
export function render(node: RemixNode, request: Request, init?: ResponseInit) {
  const stream = renderToStream(node, { signal: request.signal })
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'text/html; charset=utf-8')
  }
  return new Response(stream, { ...init, headers })
}
