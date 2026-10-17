# 部署：一台服务器全搞定（模式 A）

GitHub 只当代码仓库，**Render 一台服务器同时托管页面和联机**。玩家只需要一个网址。

```
https://<你的应用名>.onrender.com/     ← 游戏页面，手机电脑都开这个
wss://<你的应用名>.onrender.com/       ← 联机服务，大厅里会自动填好
```

服务器自带静态托管，所以不需要 GitHub Pages。

---

## 第一步：把代码推到 GitHub

新建一个**公开**空仓库，名字建议英文，例如 `dungeon-knight`。

```bash
cd "B:\ces\地牢骑士-无尽回响"
git remote add origin https://github.com/<你的用户名>/dungeon-knight.git
git push -u origin main --force
```

`--force` 是为了覆盖新建仓库时自动生成的 README 提交。

推之前确认这两类东西没进去（`.gitignore` 已经挡住了）：

```
dungeon-knight/     解压出来的副本
*.zip / *.zpi       分发包
tools/*.png         测试截图
```

---

## 第二步：Render 建服务

1. 打开 [render.com](https://render.com)，用 GitHub 账号登录
2. 右上 `New` → `Web Service`
3. `Connect a repository` → 选你的 `dungeon-knight` 仓库
4. 填写：

| 字段 | 填什么 |
| --- | --- |
| **Name** | `dungeon-knight`（决定最终域名） |
| **Region** | `Singapore`（离国内最近） |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `echo no build needed` |
| **Start Command** | `node server/index.mjs` |
| **Instance Type** | `Free` |

5. 展开 `Advanced` → **Health Check Path** 填 `/health`
6. `Create Web Service`

等 1~2 分钟，日志出现下面这几行就成了：

```
地牢骑士联机服务已启动
  本机游戏 : http://localhost:8080/
  房间上限 : 4 人/房
```

> 仓库里已经带了 `render.yaml`，也可以走 `New → Blueprint` 一键识别。如果 Blueprint 因为平台版本报字段错误，直接用上面的 UI 手动建，效果一样。

---

## 第三步：验证

```bash
# 服务器活着
curl https://<你的应用名>.onrender.com/health
# {"ok":true,"rooms":0,"players":0}

# 房间列表接口通
curl https://<你的应用名>.onrender.com/api/rooms
# {"ok":true,"rooms":[]}
```

浏览器打开 `https://<你的应用名>.onrender.com/`：

- 标题页能出来 → 静态托管通了
- 点「联 机」→ 大厅不报错、房间列表显示「暂无房间」→ 联机服务通了

---

## 第四步：发给朋友

把同一个网址发给他们，**不需要安装任何东西**：

1. 打开网址
2. 点「联 机」
3. 一个人点「创建房间」拿到 4 位房间码
4. 其他人打开同一网址，大厅会自动列出这个房间，点「加入」
5. 房主点「开始游戏」

大厅里的「服务器」地址是**自动填好**的（页面和联机在同一个域名），不用手输。

---

## 手机怎么玩

直接用手机浏览器打开同一个网址：

- 竖屏会提示旋转，点「竖屏继续」也能玩
- 点「全 屏」去掉地址栏，Android 会自动锁横屏
- Android 菜单 →「安装应用」，iOS 分享 →「添加到主屏幕」，之后从桌面图标启动即全屏

---

## 免费层要注意

| 事项 | 说明 |
| --- | --- |
| **休眠** | Render 免费实例 15 分钟无流量会休眠，下次访问等 30~60 秒冷启动 |
| **保活** | 用 [UptimeRobot](https://uptimerobot.com) 免费版每 10 分钟 GET 一次 `/health`，可基本避免休眠 |
| **WebSocket** | 空闲久了可能被断开，重新进一次大厅即可 |
| **并发** | 免费层够 4 人开黑，人多了要升级实例 |
| **HTTPS** | Render 自动给证书，所以联机地址是 `wss://`，不用自己配 |

---

## 以后想改代码

```bash
# 改完直接推
git add -A
git commit -m "your change"
git push
```

Render 检测到 `main` 有新提交会**自动重新部署**（`autoDeploy: true`），不用手动操作。

---

## 常见问题

**页面能打开，但点联机提示「无法获取房间列表」**
服务器还在冷启动。等 30 秒再点「刷新」。或者先 `curl` 一下 `/health` 把它唤醒。

**联机连不上，控制台报 mixed content**
说明地址填成了 `ws://`。这个页面是 https，只能连 `wss://`。大厅里改成 `wss://<域名>/`。

**房间码输入后说「房间不存在」**
房间码 4 位、只含大写字母和数字（`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`，去掉了容易看错的 `I/O/0/1`）。注意别把 `0` 当 `O`。

**想恢复 GitHub Pages 双点部署**
本项目已删除 Pages workflow。如果确实要开：

```bash
git checkout HEAD~1 -- .github/workflows/pages.yml
```

然后在仓库 `Settings → Pages` 选 `Deploy from a branch → main → /(root)`，大厅里手填 `wss://<Render 域名>`。

**私有仓库行不行**
Render 拉私有仓库免费，但 GitHub Pages 在私有仓库要 Pro。模式 A 只用 Render，所以私有仓库完全可行。

---

## 这次部署涉及的文件

| 文件 | 作用 |
| --- | --- |
| `server/index.mjs` | 联机服务：WebSocket 房间 + 静态托管 + `/api/rooms` |
| `package.json` | 让 Render 识别 Node 项目，`start` 脚本指向服务器 |
| `render.yaml` | Render 蓝图（可选，UI 手动建也一样） |
| `index.html` / `js/` / `css/` / 图标 | 由服务器直接托管给浏览器 |

**服务器端真正必需的只有 `server/index.mjs` 和 Node 18+**；带上前端文件是因为服务器顺便把页面也托管了。
