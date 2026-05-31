import { createAction } from 'remix/fetch-router'

import { getPost } from '../lib/posts.ts'
import { routes } from '../routes.ts'
import { NotFoundPage } from '../ui/not-found-page.tsx'
import { PostPage } from '../ui/post-page.tsx'
import { render } from '../utils/render.tsx'

export const post = createAction(routes.post, {
  handler({ request, params }) {
    const found = getPost(params.slug)
    if (!found) {
      return render(<NotFoundPage />, request, { status: 404 })
    }
    return render(<PostPage post={found} />, request)
  },
})
