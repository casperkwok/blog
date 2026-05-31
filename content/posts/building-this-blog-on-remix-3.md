---
title: 我用还在 beta 的 Remix 3 搭了这个博客
date: 2026-05-31
summary: 选了一个还在 active development 的框架来搭博客。记录踩到的坑、做的取舍，以及为什么最后它反而很对我胃口。
tags: remix, 前端, 工程笔记
---

这个博客是用 **Remix 3** 搭的——就是那个还挂着 `remix@next`、README 里自己写着 "under active development" 的 beta 框架。明知道有更省心的选择（比如 Astro），我还是选了它。这篇记录一下整个过程：踩到的坑、做的取舍，以及为什么折腾下来我反而挺喜欢。

## 为什么是 Remix 3

Remix 3 是 Remix 团队另起炉灶的全新框架，几条设计哲学正好戳中我：

- **Model-First**：为 LLM 优化源码、文档与抽象，把模型当成应用内的能力，而不只是开发工具。
- **Build on Web APIs**：构建在 `Request` / `Response` / `URL` / `FormData` 这些 Web 标准上，跨 runtime 可移植。
- **Religiously Runtime**：不依赖 bundler / 编译期静态分析，资源在运行时按需编译。
- **Avoid Dependencies**：目标是零依赖。

作为天天和 agent 打交道的人，"为模型优化的框架"这个定位本身就值得我花一晚上。

## 它不是 React

Remix 3 的 UI 层不是 React。组件接收一个 `handle`，返回一个**零参渲染函数**：

```tsx
function PostRow(handle: Handle<{ post: PostMeta }>) {
  return () => <a href={`/posts/${handle.props.post.slug}`}>{handle.props.post.title}</a>
}
```

刚上手时几个坑：它要求 **Node ≥ 24.3**（我本机是 22，先 `nvm install 24`）；脚手架还有个小 bug——`--app-name "Casper's Blog"` 里的撇号把生成的字符串字面量破坏了，dev 直接语法报错。beta 嘛，手动修一下就好。

## 第一个真问题：样式要刷两次才出来

最初我用框架自带的 `mix={css({...})}` 写样式。结果首屏经常没样式，刷新第二次才正常。扒了一下 SSR 输出，发现 `<style>` 标签里是**空的**——`css()` 的样式声明是**客户端 JS 注入**的，服务端只占了个空位。于是首屏要等脚本加载、冷编译完才有样式。

我的博客是纯静态内容、零交互，没必要为这个买单。索性把样式写成一张**真实的 CSS 文件**，用 render-blocking 的 `<link>` 引入——浏览器渲染前就加载好，零 FOUC，也不依赖任何 JS。

## 第二个问题：Markdown 怎么渲染

`remix/ui` 没有 `dangerouslySetInnerHTML` 这种注入原始 HTML 的逃生舱。所以我没走"Markdown → HTML 字符串 → 注入"的老路，而是用 `marked` 做词法解析，再把 token **递归渲染成 Remix UI 节点**。全程 SSR 安全，也不用担心 XSS。

```tsx
const tokens = marked.lexer(body)
return <>{renderBlocks(tokens)}</>
```

## 顺手把客户端 JS 整个删了

样式既然全在外部 CSS、页面又零交互，那客户端 runtime 也没用了。删掉那个 `<script>` 之后，链接跳转回归浏览器原生导航——**瞬间完成**，再没有之前软导航卡顿的问题。一个静态博客，本就不需要 hydration。

## 部署：进不了 Cloudflare，那就自己托管

Remix 3 跑的是一个常驻 Node 服务，资源还在运行时按需编译（要读文件系统）。这意味着它**进不了 Cloudflare Workers**——那是没有文件系统的 V8 isolate。纠结过要不要为此换框架，最后决定不将就：直接部署到自己的服务器，前面用 Caddy 反代 + 自动 HTTPS。包管理用 pnpm，实测它的 symlink 结构和运行时按需编译配合得也没问题。

## 设计上的反复

设计倒是比框架还磨人。试过终端窗口风（太俗）、暗色产品风、衬线编辑风……最后想通两件事：一是字体别整花活，**系统默认字体**最快最稳；二是配色收敛成**黑蓝**，干净。列表参考了 [eugeneyan.com](https://eugeneyan.com)——`日期 + 标题`一行，不堆摘要，一屏能扫很多篇。

## 值不值

如果只想要个省心的写作平台，老实用 Astro。但如果你愿意把博客当成一个"想玩的项目"，Remix 3 这趟很值——它逼着我把"一个博客到底需要什么"重新想了一遍，砍掉了所有不必要的东西。至少，它让我有了这篇开篇。
