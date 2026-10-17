# 给 AI 的操作说明（改这个站前先读）

站主不写代码：他说要加文章、换图、改文案，你负责做完并发布上线。

## 一、三条铁律

1. **隐私**：正文与配图里**不要**出现学校名、学号、真实姓名、客户或公司名。加图之前先看一眼内容。
2. **风格**：简洁、大气、简练、正式。不写没做过的事，不编过程、不编数据。
3. **文件**：文本一律 UTF-8（无 BOM）；`.bat` / `.cmd` 只写纯 ASCII；要长期保留的东西放 D 盘。

## 二、加一篇文章

1. 建目录 `src/content/blog/<slug>/`，写 `zh-cn.md`：

```md
---
title: 标题
pubDate: 2026-10-11
description: 一句话摘要
category: 分类名
image: "./cover.jpg"
draft: false
slugId: blog/<slug>
pinTop: 0
---

正文……
```

2. 配图放同一个目录：`cover.jpg` 作封面，正文里写 `![说明](./01.jpg)`。
3. `draft: true` 的文章不会出现在列表与归档里。
4. 加完**重启 `pnpm dev`** 才能看到新文章。

## 三、改已有文章

直接改 `src/content/blog/<slug>/zh-cn.md`，`pnpm dev` 会热更新。英文版是同目录的 `en.md`，没有就自动回退中文。

## 四、作品集（手维护，没有生成器）

一个条目由四处组成，改的时候要一起改：

| 位置 | 内容 |
| --- | --- |
| `src/content/blog/works/<id>/zh-cn.md` | 正文；frontmatter 的 `category` 决定进哪个分区 |
| `src/content/blog/works/<id>/cover.jpg` + `01.jpg`… | 配图（最大边 1200px、JPEG q80） |
| `public/works/thumb/<id>.webp` | 作品集卡片封面（400px；页面**只**用这一张） |
| `src/data/portfolio.json` | 该条目的标题 / 时间 / 工具 / 标签 / 封面路径 / `weight` |

**加一件新作品**：从工作目录（例如 `D:\手机壳\输出`、`D:\1产线动画\车顶架\ai生图`）把图拷进文章目录并压到 1200px →
出一张 400px webp 当卡片封面 → 把条目块并进 `portfolio.json` 对应分区的 `works`
（该分区 `count` 与顶层 `total` 各 +1）→ `pnpm build`（当前 **173** 页）→ `node D:\agent\audit-links.mjs`（应为 0 坏链）。

**权重**（`portfolio.json` 的 `weight`）只影响排序与「代表作」角标：

| 权重 | 定位 |
| --- | --- |
| 5 | 代表作（卡片左上角带角标） |
| 4 | 重点项目 |
| 3 | 正常收录 |
| 2 | 简单记录 |
| 1 | 只留个档 |

> ⚠️ 权重由站主自己定，**不要替他调**。

## 五、改站点本身

| 想改什么 | 改哪 |
| --- | --- |
| 站名、域名、头像、联系方式、主题开关、访客计数器 | `src/config.ts` |
| 界面文字（导航、页脚、按钮） | `src/i18n/translation.ts`，语言包在 `src/i18n/language/` |
| 「关于」页正文 | `src/content/spec/about/zh-cn.md`（英文 `en.md`） |
| 首页文章卡片样式 | `src/components/PostCard.astro` |
| 作品集卡片 | `src/components/misc/WorkGrid.astro`；分区顺序与精选名额在 `src/pages/[...locale]/works.astro` |
| 摄影页数据 | `src/data/photos.json` + `public/photos/<slug>/` |
| 展板总览数据 | `src/data/boards.json` + `public/boards/` |
| 缓存与安全响应头 | `public/_headers` |
| 页脚访客数 | `src/config.ts` 的 `visitCounterConfig` + `src/components/Footer.astro` |
| 首页滚到底自动翻页 | `src/components/control/AutoPaginate.astro` + `src/pages/[...locale]/[...page].astro` |

## 六、必须知道的坑

1. **别用 `pnpm momo update`**（模板自带的更新命令，会把改过的代码覆盖回去；本项目里已删掉）。
2. **线上是三个地址**：`204041.xyz`（主域）、`ntfox.pages.dev`、`nitianfox.github.io`。canonical 与 sitemap 统一指向主域，**换域名只改 `src/config.ts` 的 `rootSiteUrl`**。
3. **推送网络**：GitHub 直连常超时，`publish.ps1` 会自动走代理 `127.0.0.1:7890`（FlClash）；代理没开就直连，失败就开代理重跑。
4. **子路径部署**：当前三个地址都在根路径（`base` = `/`）；要放到子路径就设环境变量 `BASE_PATH`，构建后由 `script/apply-base.mjs` 重写绝对地址（CSS 里的 `url(/…)` 也会一起改）。
5. **新增文章后必须重启 `pnpm dev`**，否则新文章 404。
6. **别用后台标签页验滚动加载**：`IntersectionObserver` 在后台标签页不派发回调。用 `node D:\agent\browser-check.mjs <地址>`（自带无头浏览器）或让站主自己看。
7. 文本文件 UTF-8 无 BOM；`.bat` / `.cmd` 纯 ASCII。

## 七、常用命令

```powershell
pnpm dev                                     # 本地预览
pnpm build                                   # 构建
pnpm preview                                 # 预览构建产物
pnpm cms                                     # 可视化后台
.\publish.ps1 "说明"                          # 提交并推送（两平台自动上线）
node D:\agent\audit-links.mjs                # 坏链自查
node D:\agent\browser-check.mjs http://localhost:4322   # 真浏览器验首页自动翻页 + 页脚访客数
```

更细的配置字段见 `自定义指南.md`。
