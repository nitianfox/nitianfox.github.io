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

## 四、作品集（`/works/` 和 `works/` 下的文章）

作品集 44 篇原本由 `D:\工业设计作品集`（素材库）的生成器维护：

```powershell
node script/portfolio/gen-posts.mjs            # 结构/数据/新条目（不动已有正文）
node script/portfolio/gen-posts.mjs --images   # 只按配置重做配图（正文一个字不动）
node script/portfolio/gen-boards.mjs           # 展板总览页
```

> ### ⚠️ 2026-10-09 起：**别再跑 `gen-posts.mjs`**
>
> 它依赖的两个输入在 2026-10-04 的清理里被删了，现在跑会**改坏已经上线的数据**：
> `D:\作品集配图\*`（删）→ 6 个条目的 `cover` 会被清空
> （`04-35` `04-36` `02-22` `02-23` `02-24` `01-09`，作品集网格卡片直接没图）；
> `D:\agent\image-selection.json`（删）→ 一堆条目 `imgSource` 从「挑选台」变「自动」；
> 更麻烦的是**它会用源图重刷所有 `public/works/*.jpg` 与 `thumb/*.webp`**，
> 而 `03-27` / `03-30` 那两张封面是**手工打过隐私码的**，被刷掉就等于把码洗了。
>
> **正确做法（2026-10-09 加「车顶架与车尾架」时就是这么做的）**：
> ① 图片放 `D:\工业设计作品集\<项目>\`；② 手写 `src/content/blog/works/<id>/zh-cn.md`
> + `cover.jpg` + `NN.jpg`（1200px、q80），照 `works/roof-rack/` 抄；
> ③ 手工生成 `public/works/thumb/<id>.webp`（400px，列在作品集网格卡片上用）和 `public/works/<id>.jpg`；
> ④ 手工把条目块并进 `src/data/portfolio.json` 对应分区的 `works` 数组，并把该分区 `count` 和顶层 `total` 各 +1。
> 真要用生成器，跑之前先 `git status` 存档 + 备份 `public/works`，跑完把不想要的改动 `git checkout --` 掉。
>
> 配置仍在 `script/portfolio/`：`weights.json`（权重=图片数量档位）、`merges.json`（合并/改名/改日期）、
> `sections.json`（分类归属与排序）、`manual-images.json` / `extra-images.json`（指定某篇用哪些图）、
> `extra-entries.json`（额外条目，`roof-rack` 就登记在这里）。

**只想给某篇补图**：把图放进那篇文章目录、改 `## 预览` 节即可（参考 `works/02-25` 的写法），不用碰生成器。

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
| 页脚访问量计数器 | `src/config.ts` 的 `visitCounterConfig`（实现见 `src/components/Footer.astro` 末尾） |
| 首页滚到底自动翻页 | `src/components/control/AutoPaginate.astro` + `src/pages/[...locale]/[...page].astro` |

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

---

## 八、页脚访问量计数器（2026-10-04 加的）

页脚那行「访客 N 人」走的是第三方 **Vercount**（busuanzi 不蒜子的兼容替代，服务端在 Vercel）。
当时实测**不蒜子官方接口已经 502**，所以选了它。页脚**只显示访客总数（UV）**，不显示本页/本站次数。

**三个地址共用一份计数**：不管从哪个域名进来，都按 `reportAs`（= `siteConfig.rootSiteUrl`，正式域名）上报；
服务端是按「上报网址的 host」记账的（实测：同一个 url 换 Origin 计数连续累加，换 host 才各算一份），
所以 204041.xyz / ntfox.pages.dev / nitianfox.github.io 页脚看到的是同一个数字。

| 项 | 说明 |
| --- | --- |
| 配置 | `src/config.ts` 的 `visitCounterConfig`（`enable` / `apiUrl` / `reportAs` / `domains`） |
| 实现 | `src/components/Footer.astro` 末尾那段内联脚本（`data-swup-ignore-script`） |
| 接口 | `POST https://events.vercount.one/api/v2/log`，body `{url, isNewUv}` → `{status,data:{site_pv,page_pv,site_uv}}` |
| 显示 | 只取 `data.site_uv`（访客总数） |
| 计数时机 | 首次加载一次 + 每次 swup 换页一次（`astro:page-load`）；同一网址连续重复触发会去重 |
| UV 去重 | cookie `vercount_uv_<正式域名的host>`，一年有效 |
| 失败表现 | 接口不可用（被墙/离线/限流）时整块隐藏，不显示 0 或「-」，不影响页面其它功能 |
| 自测 | `node D:\agent\test-counter.mjs`（取 dist 里的真实脚本打真实接口，校验上报地址与渲染） |

**注意：**

1. **`domains` 是"允不允许计"的白名单**：`204041.xyz`、`www.204041.xyz`、`ntfox.pages.dev`、
   `nitianfox.github.io`、`localhost`、`127.0.0.1` 都在里面，且显示的是**同一份数字**；
   不在此列的域名（例如别人 fork 出来的镜像）既不显示也不上报，避免污染统计。
2. **UV 有一个改不掉的瑕疵**：cookie 跨不了域名，同一个人分别从正式域名和 pages.dev 进来会被算**两次** UV。
   要彻底修得自己有后端。数字不会因此离谱，但它是"偏多"的。
3. **换正式域名**：只需改 `siteConfig.rootSiteUrl` 一处。注意**历史计数留在旧域名账下**，
   新域名会从 0 开始（想让新域名继承旧数字，现在没有接口可迁）。
4. **数据在别人服务器上**：只有累计数字，没有明细、来源、地区。
   要看真实流量明细用 Cloudflare 后台的 **Web Analytics**（免费、无 cookie）。
5. **隐私**：脚本只把当前网址和「本机是否首次来访」发给 vercount，不发 IP、不读本地信息。
6. **关掉**：`visitCounterConfig.enable = false` → 构建产物里连那段脚本都不会输出。
7. **换服务**（例如以后自建 Cloudflare Worker）：新接口只要接受 `{url, isNewUv}` 并返回
   `{data:{site_pv,page_pv,site_uv}}`，改 `apiUrl` 一行即可；格式不同就改 `Footer.astro` 里那段脚本。

---

## 九、首页「滚到底自动翻页」（2026-10-04 加的）

首页文章流滑到底会自动接上下一页（现在 12 页 67 篇会一路接完），**分页器仍然保留**，想看某一页照样能点。

| 项 | 说明 |
| --- | --- |
| 组件 | `src/components/control/AutoPaginate.astro`（哨兵 + 逻辑），挂在 `[...page].astro` |
| 追加目标 | `[...page].astro` 里 `<div id="post-feed">` 包住 `<PostPage>`；新卡片直接 append 进去 |
| 下一页地址 | 构建时算好写进哨兵 `data-next`（规则与 `Navi.astro` 的 `getPageUrl` 一致），下一页地址从抓回来的文档里取 |
| 触发 | IntersectionObserver，`rootMargin: 600px`（提前一屏多开始取） |
| 追加后 | 手动跑一次 `runPageInit()`（`src/utils/pageInit.ts` 新导出的）——AOS / 灯箱等要重新收集元素 |
| 兜底 | 同一批卡片按链接去重；最多追加 30 页；失败保留下一页地址并显示"点击重试" |
| 自测 | `node D:\agent\test-autopaginate.mjs`（静态：标记与 data-next 串联）；真浏览器验 `node D:\agent\browser-check.mjs <预览地址>` |

**注意：**

1. 哨兵元素**不能用 `hidden`/`display:none`**——那样 IntersectionObserver 永远不触发。
   它常驻但默认 `opacity:0`，只在加载/失败时显形。
2. **别用 web-access 的 CDP 代理验滚动加载**：它开的是**后台标签页**，后台标签页不派发
   IntersectionObserver 回调（实测 `visibilityState=hidden`，滚到底也不会加载）。
   用 `browser-check.mjs`（自己起无头 Chrome）或让用户自己看。
3. 自动翻页只做了**首页文章流**；`/works/`、`/photos/`、`/archives/` 不受影响。
4. 新增 / 删除文章的页数变化不用管，`data-next` 是构建时按 `paginate` 结果算的。
