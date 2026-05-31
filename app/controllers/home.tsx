import { createAction } from 'remix/fetch-router'

import { getAllPosts } from '../lib/posts.ts'
import { routes } from '../routes.ts'
import { HomePage } from '../ui/home-page.tsx'
import { render } from '../utils/render.tsx'

export const home = createAction(routes.home, {
  handler({ request }) {
    return render(<HomePage posts={getAllPosts()} />, request)
  },
})
