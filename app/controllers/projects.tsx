import { createAction } from 'remix/fetch-router'

import { routes } from '../routes.ts'
import { ProjectsPage } from '../ui/projects-page.tsx'
import { render } from '../utils/render.tsx'

export const projects = createAction(routes.projects, {
  handler({ request }) {
    return render(<ProjectsPage />, request)
  },
})
