# Casper's Blog — Bun + Remix 3
# Remix 3 是「运行时」框架：浏览器资源按需编译，无独立 build 步骤，
# 所以镜像里只需装依赖 + 拷源码 + bun 跑 server.ts。

FROM oven/bun:1-alpine AS base
WORKDIR /app

# ---- 依赖层（在 linux 容器内安装，拿到正确平台的 esbuild 二进制）----
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# ---- 运行层 ----
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=44100
# 健康检查需要 curl
RUN apk add --no-cache curl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 44100
CMD ["bun", "run", "server.ts"]
