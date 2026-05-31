#!/bin/bash
# Casper's Blog 零停机部署脚本（参考 xiaoliang-web）
# 用法：在服务器项目目录执行 ./deploy.sh
# 反代 + HTTPS 由 1Panel 管理（站点指向 127.0.0.1:44200）

set -e

echo "🚀 开始零停机部署 Casper's Blog..."

CONTAINER_NAME="casper-blog"
NEW_CONTAINER_NAME="casper-blog-new"
IMAGE_TAG="casper-blog:latest"
NEW_IMAGE_TAG="casper-blog:new"
CONTAINER_PORT=44100        # 容器内监听端口
PORT=44200                  # 宿主正式端口（避开 aura/xiaoliang）
TEMP_PORT=44201             # 宿主临时端口
NETWORK="1panel-network"

# 环境变量文件
if [ -f ".env.production" ]; then
    ENV_FILE=".env.production"
elif [ -f ".env" ]; then
    ENV_FILE=".env"
else
    echo "⚠️  未找到 .env / .env.production，将不注入额外环境变量"
    ENV_FILE=""
fi
[ -n "$ENV_FILE" ] && echo "✅ 使用环境配置: $ENV_FILE"

# 检查 Docker
docker info > /dev/null 2>&1 || { echo "❌ Docker 未运行"; exit 1; }

# 当前版本
[ -d ".git" ] && echo "📝 当前版本: $(git --no-pager log -1 --oneline)"

# 构建新镜像
echo "🔨 构建新镜像..."
docker build -t $NEW_IMAGE_TAG . || { echo "❌ 构建失败"; exit 1; }

OLD_EXISTS=false
docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$" && OLD_EXISTS=true

run_container() {  # $1=name  $2=hostport
    docker run -d \
        --name "$1" \
        --network $NETWORK \
        -p 127.0.0.1:$2:$CONTAINER_PORT \
        ${ENV_FILE:+--env-file $ENV_FILE} \
        -e NODE_ENV=production \
        -e PORT=$CONTAINER_PORT \
        --restart unless-stopped \
        $NEW_IMAGE_TAG
}

# 启动新容器（临时端口）
echo "🚀 启动新容器（临时端口 $TEMP_PORT）..."
docker rm -f $NEW_CONTAINER_NAME 2>/dev/null || true
run_container $NEW_CONTAINER_NAME $TEMP_PORT

# 健康检查
echo "🏥 健康检查..."
HEALTHY=false
for i in $(seq 1 30); do
    if ! docker ps --format '{{.Names}}' | grep -q "^${NEW_CONTAINER_NAME}$"; then
        echo "❌ 新容器已退出"; docker logs $NEW_CONTAINER_NAME --tail 50
        [ "$OLD_EXISTS" = true ] && docker start $CONTAINER_NAME || true
        exit 1
    fi
    if curl -fs http://localhost:$TEMP_PORT/api/health > /dev/null 2>&1; then
        HEALTHY=true; echo "✅ 健康检查通过！"; break
    fi
    echo "   等待中 $i/30..."; sleep 2
done

if [ "$HEALTHY" = false ]; then
    echo "❌ 健康检查失败"; docker logs $NEW_CONTAINER_NAME --tail 50
    docker rm -f $NEW_CONTAINER_NAME 2>/dev/null || true
    [ "$OLD_EXISTS" = true ] && docker start $CONTAINER_NAME || true
    exit 1
fi

# 切换：删新容器，用正式名+正式端口重启
echo "🔄 切换到正式端口 $PORT..."
docker rm -f $NEW_CONTAINER_NAME
[ "$OLD_EXISTS" = true ] && docker rm -f $CONTAINER_NAME
run_container $CONTAINER_NAME $PORT

docker tag $NEW_IMAGE_TAG $IMAGE_TAG
docker image prune -f

echo "🎉 部署完成！容器: $CONTAINER_NAME，本地端口: 127.0.0.1:$PORT"
docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "💡 查看日志: docker logs -f $CONTAINER_NAME"
