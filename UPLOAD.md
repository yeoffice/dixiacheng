# 上传说明（只看这一页就够）

## 先说清楚：GitHub 不会解压你的 zip

把 `dungeon-knight.zip` 直接拖到 GitHub，仓库里就只是一个下载文件，**游戏打不开**（根目录没有 `index.html`）。

正确做法是：**解压 → 拖解压出来的内容**。

---

## 第一步：解压

右键 `dungeon-knight.zip` → **全部解压**。

你会得到一个 `dungeon-knight` 文件夹，里面长这样：

```
dungeon-knight/
├─ index.html
├─ js/           ← 12 个 .js
├─ css/
├─ server/       ← 联机服务
├─ package.json
├─ manifest.json
├─ icon*.png / icon.svg
├─ 一键联机.bat
├─ 公网联机.bat
├─ 启动游戏.bat
├─ README.md / QUICKSTART.md / DEPLOY.md
├─ tools/
└─ render.yaml
```

---

## 第二步：上传到 GitHub

### 用网页（不需要命令行）

1. 打开你的仓库首页
2. 点 `Add file` → `Upload files`
3. **双击进入** `dungeon-knight` 文件夹（重要：进到文件夹里面）
4. `Ctrl+A` 全选里面的**所有文件和文件夹**
5. 拖到网页的虚线框里
6. 等进度条走完 → 底部 `Commit changes`

### 三个必须注意

| 错误做法 | 后果 |
| --- | --- |
| 拖 `dungeon-knight` 文件夹本身 | 变成 `/dungeon-knight/index.html`，根目录没入口，**404** |
| 只拖 `index.html` | 缺 `js/`、`css/`，**白屏** |
| 拖的是 zip 文件 | GitHub 不解压，**打不开** |

### 隐藏文件怎么办

`.gitignore`、`.gitattributes`、`.nojekyll` 这三个以点开头，Windows 默认不显示。漏了也能跑，想带上就：

资源管理器 → `查看` → 勾选 **隐藏的项目**。

---

## 第三步：分清楚「传哪里」

| 目的地 | 放什么 | 怎么放 |
| --- | --- | --- |
| **GitHub 仓库** | 上面那一整套（解压后的内容） | 网页拖拽，或 `git push` |
| **Render（服务器）** | **什么都不用传** | 它自己从 GitHub 拉代码 |

Render 只需要你填一行启动命令：`node server/index.mjs`。

---

## 其实你可能根本不用上传

先问自己一个问题：

### 只想和朋友玩，电脑能开着？

**不用上传。** 装好 Node.js 之后直接双击：

- 同一 WiFi → `一键联机.bat`
- 跨网络 → `公网联机.bat`

就这样，没有第三步。

### 想要一个网址，随时能进、电脑不用开？

那才需要：上传 GitHub → Render 接上 → 拿固定网址。

---

## 上传之后：接 Render

1. [render.com](https://render.com) 用 GitHub 登录
2. `New` → `Web Service` → 选你的仓库
3. 填：

| 字段 | 值 |
| --- | --- |
| Name | `dungeon-knight` |
| Region | `Singapore` |
| Branch | `main` |
| Runtime | `Node` |
| Build Command | `echo no build needed` |
| **Start Command** | **`node server/index.mjs`** |
| Instance Type | `Free` |

4. `Advanced` → Health Check Path 填 `/health`
5. `Create Web Service`，等 1~2 分钟

拿到 `https://dungeon-knight-xxxx.onrender.com`，这个网址就是游戏的最终入口，发给谁都能玩。

---

## 自检清单

上传完，在仓库**根目录**应该能直接看到：

- [ ] `index.html`
- [ ] `js` 文件夹
- [ ] `css` 文件夹
- [ ] `server` 文件夹
- [ ] `package.json`

只要这 5 个在根目录，就对了。

然后点开 `index.html` 看内容，如果显示的是代码而不是下载按钮，说明上传成功。

---

## 出问题了看这里

| 现象 | 原因 |
| --- | --- |
| 打开网址 404 | `index.html` 不在根目录（拖成子文件夹了） |
| 页面白屏 | `js/` 或 `css/` 没传上去 |
| Render 构建失败 | Start Command 没填对，或仓库里没有 `package.json` |
| 能玩但联机连不上 | 没填服务器的 `wss://` 地址，或 Render 还在冷启动 |
