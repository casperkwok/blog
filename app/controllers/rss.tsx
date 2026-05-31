import { createAction } from 'remix/fetch-router'

import { getAllPosts } from '../lib/posts.ts'
import { renderRss } from '../lib/rss.ts'
import { routes } from '../routes.ts'

export const rss = createAction(routes.rss, {
  handler() {
    return new Response(renderRss(getAllPosts()), {
      headers: { 'content-type': 'application/xml; charset=utf-8' },
    })
  },
})
