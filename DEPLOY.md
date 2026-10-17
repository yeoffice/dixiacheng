# 部署到 GitHub Pages

本作是**纯静态、零依赖、无构建步骤**的项目（所有资源走相对路径，普通 `<script>` 加载，无 `type="module"`、无 `fetch`），因此 GitHub Pages 可以原样托管，不需要任何 CI 编译。

---

## 方式一：分支直发（最快，两步）

1. 在 GitHub 新建**公开**空仓库，名字建议纯英文，例如 `dungeon-knight`。
2. 本地推上去，然后到仓库 `Settings → Pages`：

```
Source            : Deploy from a branch
Branch            : main
Folder            : / (root)
```

保存后等 1~2 分钟，访问：

```
https://<你的用户名>.github.io/dungeon-knight/
```

推送命令：

```bash
git remote add origin https://github.com/<你的用户名>/dungeon-knight.git
git push -u origin main
```

---

## 方式二：Actions 自动发布（已内置）

仓库里已经带了 `.github/workflows/pages.yml`，推 `main` 即自动发布，也可以手动 `Run workflow`。

启用位置：

```
Settings → Pages → Source: GitHub Actions
```

首次推送后到 `Actions` 标签页看 `Deploy to GitHub Pages` 是否变绿；`Settings → Pages` 会显示正式地址。

只需二选一，**不要同时**用两种方式（会互相覆盖发布源）。

---

## 目录里已经为你准备好的文件

| 文件 | 作用 |
| --- | --- |
| `.nojekyll` | 关闭 Jekyll 处理，避免以下划线开头的文件被吞 |
| `.gitattributes` | 统一 LF 换行，`*.bat` 保持 CRLF，`*.png` 按二进制 |
| `.gitignore` | 忽略系统垃圾与测试产物 |
| `.github/workflows/pages.yml` | Pages 自动发布流水线 |

---

## 已验证的兼容性

| 检查项 | 结果 |
| --- | --- |
| 子路径部署（`/repo/` 前缀） | 通过，`index.html`、`css/`、`js/`、`screenshot.png` 全部 200 |
| 绝对路径引用 | 无，全部相对路径，子目录托管无死链 |
| ES Module / 打包器 | 无，普通 `<script>` 顺序加载 |
| 外部 CDN / 网络请求 | 无，纯本地资源与 WebAudio 合成 |
| 音频自动播放限制 | 首次点击/开始冒险后解锁，不受托管影响 |
| 存档 | `localStorage`，按域名隔离，换仓库名等于换存档 |
| 无头逻辑测试 | `node tools/smoke.mjs .` → 61 项全过 |

---

## 手机与 PWA

托管后手机直接访问 `https://<你的用户名>.github.io/dungeon-knight/`：

1. 标题页点「全 屏」，Android Chrome 会进入全屏并尝试锁定横屏。
2. Android Chrome 菜单 →「安装应用 / 添加到主屏幕」；iOS Safari 分享 →「添加到主屏幕」。之后从桌面图标启动即全屏无地址栏。
3. 竖屏打开会提示旋转，点「竖屏继续」也能玩（系统锁定旋转时的逃生通道）。
4. `manifest.json` 的 `start_url` / `scope` 都是相对路径，放在仓库子目录下也能正确安装。

`file://` 双击打开时脚本会跳过 manifest 注入（否则控制台会报 CORS），此时只是不能“安装”，游戏照常玩。

---

## 部署总览：两块，各管一段

| 放哪里 | 放什么 | 干什么 |
| --- | --- | --- |
| **GitHub Pages** | 前端静态文件（`index.html`、`js/`、`css/`、图标、`manifest.json`） | 单机游戏 + 联机大厅界面 |
| **Node 服务器**（Render / Railway / Fly.io / VPS） | 整个仓库（至少 `server/` + 前端文件） | 联机房间、WebSocket 转发、房间列表 API |

Pages 跑不了 WebSocket，所以联机必须有第二块。**但服务器自己也托管前端**，所以也可以偷懒：只部署服务器，用它一个地址全搞定。

---

## 一、GitHub 放什么

推整个仓库就行。注意：

- `server/` 放进仓库**无害**，Pages 只是把它当静态文件，不会执行
- 不要推 `dungeon-knight/`（解压副本，已在 `.gitignore`）
- 不要推 `*.zip` / `*.zpi`

```bash
git remote add origin https://github.com/<用户名>/dungeon-knight.git
git push -u origin main --force
```

`Settings → Pages → Deploy from a branch → main → /(root)`。

---

## 二、服务器放什么 / 怎么起

### 方案 A：Render（免费，最省事，自带 HTTPS/WSS）

1. Render Dashboard → `New` → `Web Service` → 连你的 GitHub 仓库
2. 填：
   - **Runtime**: Node
   - **Build Command**: 留空（零依赖，不需要装包）
   - **Start Command**: `node server/index.mjs`
   - **Plan**: Free
   - **Health Check Path**: `/health`
3. Create → 等 1~2 分钟，拿到 `https://dungeon-knight-xxxx.onrender.com`

仓库里已带 `render.yaml`，也可以走 `New → Blueprint` 自动识别。

### 方案 B：Railway / Fly.io（不用 Docker）

- **Railway**：New Project → Deploy from GitHub → 选仓库 → Start Command 填 `node server/index.mjs`，端口读 `PORT`。
- **Fly.io**：`fly launch` 时选 Node 运行时，启动命令填 `node server/index.mjs`，或直接在 `fly.toml` 写：

```toml
[processes]
  app = "node server/index.mjs"

[http_service]
  internal_port = 8080
  force_https = true
```

两者都是零依赖，不需要 `npm install`。

### 方案 C：自己的 VPS

```bash
git clone <你的仓库>
cd dungeon-knight
node server/index.mjs        # 默认 8080，可 PORT=9000
```

Nginx 反代 + certbot 拿证书，WebSocket 要透传 `Upgrade` / `Connection`：

```nginx
location / {
  proxy_pass http://127.0.0.1:8080;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
}
```

### 方案 D：局域网（不部署，直接玩）

```bash
node server/index.mjs
```

手机开 `http://<电脑IP>:8080/`，大厅服务器填 `ws://<电脑IP>:8080`。

---

## 三、地址怎么填

假设服务器域名是 `dungeon-knight.onrender.com`：

| 你在哪玩 | 大厅「服务器」填 |
| --- | --- |
| GitHub Pages | `wss://dungeon-knight.onrender.com` |
| 服务器自己的页面 | 自动填好，不用管 |
| 局域网 | `ws://192.168.x.x:8080` |

**填一次会记住**（存 `localStorage`），下次打开自动带出来。

> `https` 页面只能连 `wss://`，浏览器会拦 `ws://`。Render / Fly / Railway 都自动给 HTTPS，填 `wss://` 即可。

---

## 四、验证部署成功

```bash
curl https://dungeon-knight.onrender.com/health
# {"ok":true,"rooms":0,"players":0}

curl https://dungeon-knight.onrender.com/api/rooms
# {"ok":true,"rooms":[]}
```

浏览器打开服务器地址本身，游戏能玩、能建房，就说明两段都通了。

---

## 免费层注意

- **Render 免费实例 15 分钟无流量会休眠**，下次访问要等 30~60 秒冷启动；房间列表轮询会把它唤醒。
- **WebSocket 空闲可能被断开**：重新进一次大厅即可。
- 服务器不做鉴权，房间码就是唯一门槛，适合朋友之间开黑。

---

## 常见坑

- **私有仓库**：Pages 需要 GitHub Pro / 付费计划；公开仓库免费。
- **仓库名带中文**：能用，但 URL 会被百分号编码，分享出去很难看，建议英文名。
- **改完不生效**：Pages 有 CDN 缓存，强刷 `Ctrl+F5`，或用无痕窗口；Actions 方式要看最新一次部署状态。
- **想把 `tools/` 藏起来**：`tools/` 只是开发测试工具，托管上去无害；介意的话在 workflow 里改成只上传游戏目录，或把 `tools` 移出仓库。
- **手机玩**：横屏体验最佳，左半屏移动、右半屏瞄准，需 HTTPS（Pages 默认给）才能正常触发部分移动端行为。
