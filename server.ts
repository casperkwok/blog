import { router } from './app/router.ts'

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 44100

Bun.serve({
  port,
  async fetch(request) {
    try {
      const url = new URL(request.url)

      // 静态文件直接从 public/ 提供（styles.css、favicon.svg 等）
      if (url.pathname !== '/') {
        const file = Bun.file(`./public${url.pathname}`)
        if (await file.exists()) {
          return new Response(file)
        }
      }

      return await router.fetch(request)
    } catch (error) {
      console.error(error)
      return new Response('Internal Server Error', { status: 500 })
    }
  },
})

console.log(`Server listening on http://localhost:${port}`)
