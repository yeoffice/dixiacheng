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

## 常见坑

- **私有仓库**：Pages 需要 GitHub Pro / 付费计划；公开仓库免费。
- **仓库名带中文**：能用，但 URL 会被百分号编码，分享出去很难看，建议英文名。
- **改完不生效**：Pages 有 CDN 缓存，强刷 `Ctrl+F5`，或用无痕窗口；Actions 方式要看最新一次部署状态。
- **想把 `tools/` 藏起来**：`tools/` 只是开发测试工具，托管上去无害；介意的话在 workflow 里改成只上传游戏目录，或把 `tools` 移出仓库。
- **手机玩**：横屏体验最佳，左半屏移动、右半屏瞄准，需 HTTPS（Pages 默认给）才能正常触发部分移动端行为。
