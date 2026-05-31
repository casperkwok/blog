<div align="center">

# Casper's Blog

**用 [Remix 3](https://github.com/remix-run/remix) (beta) 搭的个人博客。**
极简阅读 + 终端青绿点缀，Markdown 写作，自托管 + Caddy。

![Remix 3](https://img.shields.io/badge/Remix-3_beta-000000?style=flat-square)
![Node](https://img.shields.io/badge/Node-%E2%89%A524.3-339933?style=flat-square&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)

</div>

---

## 技术选型

- **框架**：Remix 3（`remix@next`）—— server-first、Web 标准、runtime-first，UI 用 `remix/ui`（非 React）。
- **运行时**：Bun（`Bun.serve`），`bun run server.ts`。
- **样式**：手写真实 CSS（`public/styles.css`，render-blocking 引入）+ 语义 `class`，无 Tailwind、无构建步骤、无 FOUC。
- **内容**：`content/posts/*.md`，frontmatter + Markdown。用 `marked` 词法解析后**渲染成 Remix UI 节点**（非注入 HTML，SSR 安全）。
- **结构**：`app/controllers/*` 按路由拆分（`createAction`），`app/utils/render.tsx` 负责渲染。
- **部署**：常驻 Bun 服务 + Caddy 反代 / 自动 HTTPS（自托管）。

## 目录

```
blog/
├── app/
│   ├── routes.ts            URL 契约（home / post / projects / prototyping / rss）
│   ├── router.ts            createRouter + map
│   ├── controllers/         按路由拆分的 createAction（home/post/projects/…）
│   ├── utils/render.tsx     renderToStream → HTML 响应
│   ├── assets.ts            按需资源编译
│   ├── lib/                 posts / markdown / rss / projects / site
│   └── ui/                  Document / Layout / 各页面
├── content/posts/           ← 在这里写文章
├── public/styles.css        全站样式（render-blocking）
├── deploy/                  Caddyfile + systemd 示例
└── server.ts                Bun 入口（Bun.serve）
```

## 本地开发

```bash
bun install
bun dev            # http://localhost:44100
```

## 写一篇新文章

在 `content/posts/` 新建 `my-post.md`：

```markdown
---
title: 文章标题
date: 2026-06-01
summary: 一句话摘要（显示在列表和 RSS）
tags: 标签一, 标签二
---

正文用 Markdown 写……
```

文件名即 slug（`/posts/my-post`）。开发模式下改完即时生效。

## 部署（Docker + 1Panel）

容器映射到宿主 `127.0.0.1:44200`（避开 aura/xiaoliang 占用的端口），反代 + HTTPS 由 1Panel 管理（站点反向代理到 `127.0.0.1:44200`）。

```bash
# 服务器上
git clone <repo> blog && cd blog
cp .env .env.production   # 按需填写 SITE_URL 等

# 零停机部署（构建 → 临时端口起新容器 → /api/health 健康检查 → 切换 → 回滚保护）
./deploy.sh
```

也可直接用 compose：

```bash
docker compose up -d --build
```

- [`Dockerfile`](Dockerfile) —— Bun + Remix 3（运行时框架，无独立 build 步骤）
- [`docker-compose.yml`](docker-compose.yml) —— 挂 `1panel-network`，含 `/api/health` 健康检查
- [`deploy.sh`](deploy.sh) —— 零停机部署 + 失败自动回滚

| 环境变量 | 作用 | 默认 |
|---|---|---|
| `PORT` | 监听端口 | `44100` |
| `NODE_ENV` | `production` | — |
| `SITE_URL` | 线上地址（影响 RSS / OG / canonical） | `http://localhost:44100` |

## License

© Casper
