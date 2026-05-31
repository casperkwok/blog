import { createAction } from 'remix/fetch-router'

import { routes } from '../routes.ts'
import { PrototypingPage } from '../ui/prototyping-page.tsx'
import { render } from '../utils/render.tsx'

export const prototyping = createAction(routes.prototyping, {
  handler({ request }) {
    return render(<PrototypingPage />, request)
  },
})
