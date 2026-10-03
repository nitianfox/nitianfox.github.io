# 给 AI 的操作说明（改这个网站前先读）

站主不写代码。**他让你加文章、改文章、换图、改文案，你负责做完并发布上线。**

---

## 一、三条铁律

1. **动手生成/构建前，先停掉 `pnpm dev`**（HMR 会和生成器抢 `src/content` 里的文件，偶发 `image-not-found` 假失败），做完再开回来。
2. **一篇文章 = 一个文件夹**：`src/content/blog/<文章名>/`，正文放 `zh-cn.md`（要英文就再加 `en.md`）。图片放同一个文件夹里。
3. **改完必须发布**，否则线上不变：`cd D:\NTFOX; .\publish.ps1 "这次改了什么"`（它做 `git add + commit + push`，两个平台自动构建，约 1~3 分钟上线）。

---

## 二、加一篇文章

1. 建文件夹 + 正文文件：

```
src/content/blog/<文章名>/zh-cn.md
src/content/blog/<文章名>/cover.jpg      ← 列表卡片图（可选，但建议有）
src/content/blog/<文章名>/01.jpg 02.jpg …  ← 正文插图
```

2. `zh-cn.md` 的 frontmatter 照抄这个格式：

```markdown
---
title: 文章标题
pubDate: 2026-10-03          # 发布时间，决定首页顺序
description: 一句话摘要（列表里显示）
category: 建模渲染            # 归档分类：建模渲染 / 场景动画 / 平面设计 / 展板
image: "./cover.jpg"         # 没有封面就写 ""
draft: false                 # true = 不发布
slugId: blog/文章名
pinTop: 0
---

正文…
```

3. 正文里插图写相对路径：`![说明文字](./01.jpg)`（不要写 `/xxx.jpg` 这种绝对路径）
4. 图片**先压好再放进来**：长边 ≤ 1200px、JPG q80。直接丢手机原图（3~5 MB）会让整站变重。
5. `.\publish.ps1 "新增文章：xxx"` → 上线。

---

## 三、改已有的文章

- 直接编辑 `src/content/blog/<文章名>/zh-cn.md`（正文、标题、日期都能改），改完 publish 即可。
- 也可以开可视化后台：`pnpm cms` → http://localhost:5188（页面上直接改字、换图，不用碰代码）。
- **只想换配图**：把新图放进文章文件夹，然后改正文里的 `![...](./NN.jpg)` 行；别删整个文件夹重建。

---

## 四、作品集（`/works/` 和 `works/` 下的文章）——有生成器，别手改

作品集 40+ 篇是由 `D:\工业设计作品集`（素材库）自动生成的：

```powershell
node script/portfolio/gen-posts.mjs            # 结构/数据/新条目（不动已有正文）
node script/portfolio/gen-posts.mjs --images   # 只按配置重做配图（正文一个字不动）
node script/portfolio/gen-boards.mjs           # 展板总览页
```

**注意**：`--images` 会给所有条目重挑配图，图片可能变化；只想给某篇补图，就手动往文章文件夹里加图并改 `## 预览` 节（参考 `works/02-25` 的写法）。

配置都在 `script/portfolio/`：`weights.json`（权重=图片数量档位）、`merges.json`（合并条目/改名/改日期）、`sections.json`（分类归属与排序）、`manual-images.json` / `extra-images.json`（指定某篇用哪些图）、`extra-entries.json`（额外条目）。

---

## 五、改站点本身

| 想改什么 | 改哪 |
| --- | --- |
| 站名、域名、头像、联系方式、主题开关 | `src/config.ts` |
| 界面文字（导航、页脚、按钮） | `src/i18n/translation/` |
| 「关于」页正文 | `src/content/spec/about/zh-cn.md` |
| 网站头像 | `public/avatar.jpg` |
| 页脚联系方式 | `src/config.ts` 的 `contactConfig` + 关于页正文（两处都要改） |
| 缓存与安全头 | `public/_headers` |

---

## 六、必须知道的坑

1. **`pnpm momo update` 已经删掉了**（那是主题模板的更新命令，会把上游代码覆盖回来，别去恢复它）。
2. **线上有三个地址**：`https://204041.xyz`（主域）、`https://ntfox.pages.dev`、`https://nitianfox.github.io`。同一个仓库，push 后自动各自构建。canonical/sitemap 统一指向主域，由 `src/config.ts` 的 `rootSiteUrl` 决定——**换域名只改这一行**。
3. **发布时网络**：GitHub 直连常超时，`publish.ps1` 会自动走代理 `127.0.0.1:7890`（FlClash）。没开代理就直连，失败就让他启动 FlClash 再重跑。
4. **内容风格**：站主要求**简洁、大气、简练、正式**。不要"旨在打造""赋能""提升转化"这类 AI 味词；不要写他本人没做过的功能。
5. **隐私**：站主的明确要求——正文与配图里**不要出现学校名、学号、他人姓名**。写内容时注意，别把论文/作业里的这些信息带进来。
6. **编码**：所有文本文件用 UTF-8（无 BOM）；`.bat/.cmd` 只能写 ASCII。
7. **文字文件读写**：用 UTF-8 读（不要用 `Get-Content -Raw` 在 PowerShell 5.1 下读，会乱码）。

---

## 七、常用命令

```powershell
pnpm dev                                     # 本地预览 http://localhost:4321
pnpm build                                   # 构建 dist/（含搜索索引）
pnpm cms                                     # 可视化后台 http://localhost:5188
.\publish.ps1 "说明"                          # 提交并发布（两个平台自动上线）
node script/portfolio/gen-posts.mjs --images # 作品集配图重做
```

更细的改造清单见 `自定义指南.md`；常见问题的排查步骤见它的第 13、14 节。
