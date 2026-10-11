# NTFOX

个人站：首页是时间顺序的文章流，另有作品集（展板 / 动画 / 建模渲染 / 平面）、摄影、归档、关于。
Astro 7 + Svelte 5 + Tailwind 4 静态站，主题改造自 [Momo](https://github.com/Motues/Momo)（MIT）。

## 线上地址

| 地址 | 说明 |
| --- | --- |
| <https://204041.xyz> | 主域（canonical 与 sitemap 都用它） |
| <https://ntfox.pages.dev> | Cloudflare Pages |
| <https://nitianfox.github.io> | GitHub Pages |

同一个仓库，push 后两个平台各自构建，1–3 分钟生效。

## 常用命令

```powershell
pnpm install                     # 装依赖（本机走 npmmirror）
pnpm dev                         # 本地预览 http://localhost:4321
pnpm build                       # 构建 dist/（含 Pagefind 搜索索引）
pnpm preview                     # 预览构建产物
pnpm cms                         # 本地可视化后台 http://localhost:5188
.\publish.ps1 "提交说明"          # 提交并推送（自动走代理，两平台自动上线）
node D:\agent\audit-links.mjs    # 构建后自查坏链（应为 0）
```

## 目录速览

| 位置 | 内容 |
| --- | --- |
| `src/config.ts` | 站名、域名、头像、联系方式、主题开关、页脚访客计数器 |
| `src/content/blog/<slug>/` | 文章：一个目录一篇（`zh-cn.md` + 配图） |
| `src/content/blog/works/<id>/` | 作品集条目 |
| `src/data/portfolio.json` | 作品集页数据（标题 / 时间 / 工具 / 标签 / 封面 / 权重） |
| `public/works/thumb/<id>.webp` | 作品集卡片封面（页面只认这一张） |
| `public/photos/` + `src/data/photos.json` | 摄影页 |
| `cms/` | 本地可视化后台（可改文章与站点配置） |
| `script/apply-base.mjs` | 构建后重写根绝对路径，供子路径部署用 |

改内容看 `给AI的操作说明.md`；配置字段看 `自定义指南.md`。
