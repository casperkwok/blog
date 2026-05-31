import { createAction } from 'remix/fetch-router'

import { routes } from '../routes.ts'

export const health = createAction(routes.health, {
  handler() {
    return new Response('ok', {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  },
})
