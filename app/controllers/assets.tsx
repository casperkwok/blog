import { createAction } from 'remix/fetch-router'

import { assetServer } from '../assets.ts'
import { routes } from '../routes.ts'

export const assets = createAction(routes.assets, {
  async handler({ request }) {
    return (await assetServer.fetch(request)) ?? new Response('Not Found', { status: 404 })
  },
})
