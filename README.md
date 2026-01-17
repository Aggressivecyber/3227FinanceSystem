# 3227 财务报账管理系统（应用说明）

本文档描述本应用的定位、功能、接口、依赖与部署方式（面向开发/测试/运维）。

- 生产运维细节请参考：[OPS.md](OPS.md)

---

## 1. 项目概览

**3227 财务报账管理系统**用于团队/组织内部的报销申请流转。

- 前端：React + Vite（SPA 单页应用）
- 后端：Node.js + Express（REST API）
- 数据库：SQLite（Prisma ORM）
- 文件：发票/附件上传到服务器 `uploads/`，并通过 `/uploads/*` 访问

### 1.1 角色

- 普通用户（`USER`）：提交报销、查看自己的报销历史、撤回未处理申请
- 管理员（`ADMIN`）：查看所有申请并审核（通过/拒绝）、维护资金池、账号管理（查看用户 ID、软删除用户）

---

## 2. 功能列表

### 2.1 用户侧（USER）

- 注册账号
- 登录获取 Token（JWT）
- 提交报销申请
  - 金额（支持两位小数）
  - 用途说明
  - 上传 1~10 个发票文件（图片/PDF，单文件 ≤ 10MB）
- 查看我的报销历史
- 撤回未审核（`PENDING`）申请

### 2.2 管理员侧（ADMIN）

- 查看系统资金池（`total_funds`）
- 设置系统资金池
- 查看全部报销申请列表
- 审核申请：`APPROVED` / `REJECTED`
  - 审核通过会从资金池扣减申请金额
  - 记录会写入 Excel（后端 `excelService`）
- 账号管理
  - 查看所有账户（包含 `id`）
  - 删除账户（软删除：禁用账号，不删除历史报销记录与 uploads 文件）
  - 允许同用户名重新注册：会恢复被删除账号并重置密码（不创建新 ID）

---

## 3. 技术栈与依赖

### 3.1 后端（server）

主要依赖（见 `server/package.json`）：
- `express`：HTTP 服务
- `cors`：跨域
- `dotenv`：加载环境变量
- `jsonwebtoken`：JWT 登录
- `bcryptjs`：密码哈希
- `multer`：文件上传
- `@prisma/client` + `prisma`：数据库 ORM
- `xlsx`：Excel 导出/记录

### 3.2 前端（client）

主要依赖（见 `client/package.json`）：
- `react` / `react-dom`
- `react-router-dom`
- `axios`：请求
- `zustand`：状态
- `tailwindcss`：样式
- `framer-motion`：动效

---

## 4. 数据模型（Prisma / SQLite）

核心模型在 `server/prisma/schema.prisma`：

- `User`
  - `id`（自增）
  - `username`（唯一）
  - `password`（bcrypt 哈希）
  - `role`（`USER`/`ADMIN`）
  - `isDeleted`（软删除标记）
- `Reimbursement`
  - `amount`、`purpose`
  - `invoiceUrl`：JSON 字符串（存多张发票 URL 数组）
  - `status`：`PENDING` / `APPROVED` / `REJECTED` / `WITHDRAWN`
  - 关联 `userId`
- `SystemSettings`
  - `key/value`，目前用于保存 `total_funds`

---

## 5. API 接口说明

后端统一前缀：`/api`

鉴权方式：
- 登录成功返回 `token`
- 后续请求在 Header 增加：

```http
Authorization: Bearer <token>
```

### 5.1 Auth（/api/auth）

#### POST /api/auth/register

注册新用户（创建 `USER`）。

- Body（JSON）：

```json
{ "username": "alice", "password": "1234" }
```

- 特殊规则：
  - 用户名大小写不敏感去重
  - 如果同用户名账号已被软删除，会恢复该账号（`isDeleted=false`）并重置密码

#### POST /api/auth/login

登录并返回 JWT。

- Body（JSON）：

```json
{ "username": "alice", "password": "1234" }
```

- Response（示例）：

```json
{ "token": "...", "role": "USER", "username": "alice" }
```

- 软删除账号不能登录（返回 401）。

#### POST /api/auth/change-password

修改当前登录用户密码。

- 需要登录
- Body（JSON）：

```json
{ "currentPassword": "old", "newPassword": "new" }
```

### 5.2 Reimbursement（/api/reimbursement）

#### POST /api/reimbursement/submit

提交报销申请（multipart/form-data）。

- 需要登录
- 表单字段：
  - `amount`：金额（字符串/数字，最多两位小数，必须 > 0）
  - `purpose`：用途
  - `invoices`：发票文件（可多选，最多 10 个）

允许文件类型：`jpg/png/gif/webp/heic/heif/pdf`，单文件 ≤ 10MB。

失败时返回 JSON：

```json
{ "error": "只支持图片和PDF文件！" }
```

#### GET /api/reimbursement/funds

获取资金池剩余总金额（用于用户展示）。

#### GET /api/reimbursement/my

获取当前用户的申请历史。

#### POST /api/reimbursement/:id/withdraw

撤回指定申请（仅允许撤回自己的 `PENDING`）。

### 5.3 Admin（/api/admin）

所有管理员接口均要求：已登录 + `ADMIN` 角色。

#### GET /api/admin/funds

获取资金池。

#### POST /api/admin/funds

设置资金池。

- Body：

```json
{ "amount": 10000 }
```

#### GET /api/admin/requests

获取全部报销申请（含申请人用户名）。

#### POST /api/admin/requests/:id/status

审核报销申请。

- Body：

```json
{ "status": "APPROVED" }
```

允许值：`APPROVED` / `REJECTED`。

#### GET /api/admin/users

获取全部用户列表（含 `id/username/role/isDeleted`）。

#### DELETE /api/admin/users/:id

软删除用户（禁用）。

限制：
- 不能删除管理员账号
- 不能删除当前登录管理员自身

---

## 6. 运行与部署（快速版）

更详细的生产部署/运维请看：[OPS.md](OPS.md)

### 6.1 本地开发

后端：

```bash
cd server
npm install
# 配置 server/.env
npm run start
```

前端：

```bash
cd client
npm install
npm run dev
```

Vite 开发环境默认会把 `/api` 与 `/uploads` 代理到 `http://localhost:3000`。

### 6.2 生产部署（概要）

1) 后端：安装依赖、初始化数据库、PM2 常驻

```bash
cd server
npm install
npx prisma generate
npx prisma db push
pm2 start index.js --name finance-api
pm2 save
```

2) 前端：构建并发布静态文件

```bash
cd client
npm install
npm run build
sudo rsync -a --delete dist/ /var/www/finance/
```

3) Nginx：`/` 静态站 + `/api/`、`/uploads/` 反代到 3000

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. 默认账号与初始化

数据库 seed（`server/prisma/seed.js`）会创建默认管理员：
- 用户名：`root`
- 密码：`passwd`

建议首次登录后立即修改管理员密码。
