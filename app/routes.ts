import { get, route } from 'remix/routes'

export const routes = route({
  assets: get('/assets/*path'),
  health: get('/api/health'),
  home: '/',
  post: get('/posts/:slug'),
  projects: get('/projects'),
  prototyping: get('/prototyping'),
  rss: get('/rss.xml'),
})
