# 3227 财务报账管理系统（运维说明书）

适用范围：本项目当前生产部署形态为 **Nginx 提供前端静态站** + **Node.js/Express 后端（PM2 常驻）** + **SQLite（Prisma）**。

> 说明：本文档面向运维/部署人员，默认你有 Linux 服务器 root 或 sudo 权限。

---

## 1. 系统结构与端口

- 前端：Vite 构建后的静态文件
  - 产物目录：`client/dist/`
  - 线上发布目录：`/var/www/finance/`
- 后端：Express API
  - 项目目录：`server/`
  - 启动入口：`server/index.js`
  - 监听端口：默认 `3000`（由 `server/.env` 的 `PORT` 控制）
- Nginx：对外监听 80 端口
  - `/`：前端 SPA（`try_files ... /index.html`）
  - `/api/`：反向代理到 `http://127.0.0.1:3000`
  - `/uploads/`：反向代理到 `http://127.0.0.1:3000/uploads/`

---

## 2. 依赖与环境要求

- 操作系统：Ubuntu 22/24（或等价 Debian 系）
- Node.js：**建议 22.x LTS**（Vite 7 / react-router 7 需要 Node ≥ 20）
- Nginx：1.18+（Ubuntu 默认即可）
- PM2：用于守护 Node 进程

安装示例（Ubuntu）：

```bash
sudo apt-get update
sudo apt-get install -y nginx
# Node 22（NodeSource）
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

---

## 3. 关键配置（环境变量）

后端环境变量文件：`server/.env`

推荐最小配置：

```dotenv
PORT=3000
JWT_SECRET=请填写一个强随机字符串
DATABASE_URL="file:./prisma/prod.db"
```

说明：
- `JWT_SECRET`：用于签发/验证登录 token，务必保密且不可过短。
- `DATABASE_URL`：SQLite 数据库文件路径，建议使用 `server/prisma/` 目录下的 `prod.db`。

---

## 4. 数据库（Prisma / SQLite）

### 4.1 初始化/同步表结构

在 `server/` 目录执行：

```bash
cd server
npm install
npx prisma generate
npx prisma db push
```

### 4.2 初始化管理员账号（seed）

```bash
cd server
node prisma/seed.js
```

默认管理员（seed 会输出）：
- 用户名：`root`
- 密码：`passwd`

强烈建议：首次登录后立刻在管理端修改管理员密码。

### 4.3 备份与恢复（SQLite）

备份（建议停后端或至少业务低峰）：

```bash
# 停后端（可选，但更安全）
pm2 stop finance-api

# 备份数据库
cp server/prisma/prod.db /backup/prod.db.$(date +%F_%H%M%S)

# 启动后端
pm2 start finance-api
```

恢复：

```bash
pm2 stop finance-api
cp /backup/prod.db.XXXX server/prisma/prod.db
pm2 start finance-api
```

---

## 5. 文件上传（uploads）

- 后端对外静态暴露路径：`/uploads`
- 存储目录：`server/uploads/`（实际路径在后端中为 `server/uploads` 上级的 `uploads/` 目录）
- 上传规则：单文件最大 10MB；允许图片与 PDF（含常见 `jpg/png/gif/webp/heic/heif/pdf`）

备份 uploads：

```bash
tar -czf /backup/uploads.$(date +%F_%H%M%S).tar.gz uploads/
```

---

## 6. 后端服务（PM2）

### 6.1 启动/重启/查看

```bash
# 启动
cd server
pm2 start index.js --name finance-api

# 重启
pm2 restart finance-api

# 查看状态
pm2 list

# 查看日志
pm2 logs finance-api
```

### 6.2 开机自启

```bash
pm2 save
pm2 startup systemd -u root --hp /root
sudo systemctl enable pm2-root
sudo systemctl start pm2-root
```

---

## 7. 前端发布

### 7.1 构建

```bash
cd client
npm install
npm run build
```

### 7.2 发布到 Nginx 静态目录

```bash
sudo mkdir -p /var/www/finance
sudo rsync -a --delete client/dist/ /var/www/finance/
sudo systemctl reload nginx
```

---

## 8. Nginx 配置

站点配置建议位置：
- `/etc/nginx/sites-available/finance`
- `/etc/nginx/sites-enabled/finance`

示例配置（对外 80 端口默认站点）：

```nginx
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name _;

  client_max_body_size 20m;

  root /var/www/finance;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /uploads/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

生效命令：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 9. 发布/升级流程（推荐）

1) 拉取代码（或上传新版本）

```bash
cd /home/admin/3227FinanceSystem
git pull
```

2) 后端依赖/数据库同步（如有变更）

```bash
cd server
npm install
npx prisma db push
pm2 restart finance-api
pm2 save
```

3) 前端构建并发布

```bash
cd ../client
npm install
npm run build
sudo rsync -a --delete dist/ /var/www/finance/
sudo systemctl reload nginx
```

---

## 10. 常见问题排查

### 10.1 公网访问显示 “Welcome to nginx”

原因：默认站点抢占了 `default_server`。

处理：
- 确保 `sites-enabled/default` 已移除
- 确保 `finance` 站点配置里 `listen 80 default_server;`

```bash
ls -l /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl reload nginx
```

### 10.2 报账提交失败

常见原因：上传文件类型不支持或超过大小限制。

检查：
- 查看后端日志：

```bash
pm2 logs finance-api
```

- 允许类型：`jpg/png/gif/webp/heic/heif/pdf`；单文件最大 10MB。

### 10.3 502/无法访问 API

检查步骤：

```bash
# 后端是否在线
pm2 list

# 后端端口是否监听
ss -lntp | grep 3000 || true

# Nginx 配置
sudo nginx -t
sudo systemctl status nginx --no-pager -l
```

---

## 11. 安全建议（强烈建议执行）

- 修改默认管理员密码（seed 的 `root/passwd` 仅用于初始化）
- `JWT_SECRET` 使用强随机值并妥善保管
- 限制服务器安全组/防火墙只开放 80/443（不对外开放 3000）
- 定期备份 `server/prisma/prod.db` 与 `uploads/`

---

## 12. 账号删除说明（软删除）

- 管理员“删除账号”采用软删除：用户将无法登录/访问，但历史报销记录与 uploads 文件不会删除。
- 同用户名重新注册时，会恢复已删除账号并重置密码（不会创建新用户 ID），以保证历史数据仍能关联。

---

## 13. 运维速查（常用命令）

```bash
# 后端
pm2 list
pm2 logs finance-api
pm2 restart finance-api

# Nginx
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx --no-pager -l

# 前端发布
cd /home/admin/3227FinanceSystem/client
npm run build
sudo rsync -a --delete dist/ /var/www/finance/
sudo systemctl reload nginx

# 数据库备份
cp /home/admin/3227FinanceSystem/server/prisma/prod.db /backup/prod.db.$(date +%F_%H%M%S)
```
