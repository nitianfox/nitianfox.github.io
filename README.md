# NTFOX 的博客

基于 [Astro](https://astro.build/) 的静态博客，主题改造自 [Momo](https://github.com/Motues/Momo)（MIT 协议）。
黑白为主、蓝色点缀的极简设计，自带深色模式、本地搜索、RSS、文章归档、中英双语。

> **想改站点的各种内容，直接看 [`自定义指南.md`](./自定义指南.md)** —— 里面按「想改什么 → 改哪个文件」列全了。

## 本地开发

环境要求：Node.js **>= 22** + [pnpm](https://pnpm.io/zh/)。

```bash
pnpm install
pnpm dev       # 本地预览 http://localhost:4321
pnpm build     # 构建到 dist/（含 pagefind 搜索索引）
pnpm preview   # 预览构建结果
pnpm cms       # 可视化后台 http://localhost:5188
pnpm momo new 文章路径   # 新建一篇文章
```

> 装依赖走国内镜像（项目里已有 `.npmrc`），删掉 `.npmrc` 就回到 npm 官方源。

## 目录速查

| 路径 | 作用 |
| --- | --- |
| `自定义指南.md` | **改造指南**：每一项配置改哪个文件 |
| `src/config.ts` | 配置总入口：站名、域名、主题开关、头像、联系方式、多语言文案 |
| `src/content/blog/` | 文章，一篇一个文件夹（`zh-cn.md` / `en.md`） |
| `src/content/blog/works/` | 41 篇作品文章（由 `script/portfolio/gen-posts.mjs` 生成） |
| `src/content/spec/about/` | 「关于」页面的正文 |
| `src/data/portfolio.json` | 作品集页读的数据 |
| `public/works/` | 作品集网格封面 |
| `script/portfolio/gen-posts.mjs` | 从 `D:\工业设计作品集` 全量重建作品文章与作品集数据 |
| `public/avatar.jpg` | 头像 |
| `public/favicon/favicon.ico` | 站点图标 |
| `public/cover.jpg` | 首页整屏封面（`theme.photoCover.enable` 打开后才生效） |
| `dist/` | 构建产物，整个目录丢给任意静态托管即可 |

## 作品集

`/works/` 是按分类分组的作品网格，点进去是每个作品的详情文章（`/blog/works/<编号>/`）。
原数据在 `D:\工业设计作品集`，改动后跑 `node script/portfolio/gen-posts.mjs` 重新生成。

## 联系方式

在 `src/config.ts` 的 `contactConfig` 里（页脚图标读这里）；「关于」页正文里的联系方式在
`src/content/spec/about/zh-cn.md`，两处要一起改。

## 上线前待办

- [ ] `src/config.ts` 的 `rootSiteUrl` 改成真实域名（SEO、sitemap、RSS 都用它）
- [ ] 需要评论：部署 [Momo-Backend](https://github.com/Motues/Momo-Backend)，再打开 `comments` 开关并填 `backendUrl`
- [ ] 需要统计：在 `src/config.ts` 的 `analytics` 里填自己的 umami 地址

## 关于第三方请求

模板里唯一指向作者域名的运行时请求是 `::music` 音乐卡片（向 `open.motues.top` 取歌曲信息），
地址在 `src/plugins/rehype-component-music-card.ts` 的 `MUSIC_API`，不写 `::music` 就不会触发。
统计脚本与评论后端默认都是关闭的，未配置时站点不会向任何第三方域名发请求。

## 参考

- [Astro](https://astro.build/) · [Momo 主题](https://github.com/Motues/Momo) · [主题文档](https://momo.motues.top/intro/config)
