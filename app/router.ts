import { createRouter } from 'remix/fetch-router'

import { routes } from './routes.ts'
import { assets } from './controllers/assets.tsx'
import { health } from './controllers/health.tsx'
import { home } from './controllers/home.tsx'
import { post } from './controllers/post.tsx'
import { projects } from './controllers/projects.tsx'
import { prototyping } from './controllers/prototyping.tsx'
import { rss } from './controllers/rss.tsx'

export const router = createRouter()

router.map(routes.assets, assets)
router.map(routes.health, health)
router.map(routes.home, home)
router.map(routes.post, post)
router.map(routes.projects, projects)
router.map(routes.prototyping, prototyping)
router.map(routes.rss, rss)
