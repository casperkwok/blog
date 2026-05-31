// 站点级配置。部署到自己的域名后，把 url 改成线上地址（影响 RSS / OG 链接）。
export const site = {
  title: "Casper's Blog",
  description: 'AI agent builder & indie hacker。记录智能体、终端工具与造产品的过程。',
  author: 'Casper',
  url: process.env.SITE_URL || 'http://localhost:44100',
  // 终端提示符里显示的主机名
  host: 'blog',
  user: 'casper',
  links: {
    github: 'https://github.com/casperkwok',
    email: 'mailto:casperkwok97@gmail.com',
  },
}
