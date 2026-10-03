# NTFOX 的博客

基于 [Astro](https://astro.build/) 的静态博客，主题改造自 [Momo](https://github.com/Motues/Momo)（MIT 协议）。
黑白为主、蓝色点缀的极简设计，自带深色模式、本地搜索、RSS、文章归档、中英双语。

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

> 本机直连 npm 官方源只有几 KB/s，装依赖时走国内镜像：
> `pnpm install --registry=https://registry.npmmirror.com`

## 目录速查

| 路径 | 作用 |
| --- | --- |
| `src/config.ts` | **配置总入口**：站名、域名、主题开关、头像、友链、多语言文案 |
| `src/content/blog/` | 文章，一篇一个文件夹（`zh-cn.md` / `en.md`） |
| `src/content/spec/` | 「关于」「友链」页面的正文 |
| `src/assets/avatar.png` | 头像 |
| `public/favicon/favicon.ico` | 站点图标 |
| `public/cover.jpg` | 首页整屏封面（`theme.photoCover.enable` 打开后才生效） |
| `dist/` | 构建产物，整个目录丢给任意静态托管即可 |

头像、favicon、封面目前都是本地生成的占位图，直接替换同名文件就能换掉。

## 上线前待办

- [ ] `src/config.ts` 的 `rootSiteUrl` 改成真实域名（SEO、sitemap、RSS 都用它）
- [ ] 换成自己的头像和 favicon
- [ ] 友链页 `src/content/spec/friends/zh-cn.md` 里的邮箱换成自己的
- [ ] 需要评论：部署 [Momo-Backend](https://github.com/Motues/Momo-Backend)，再打开 `comments` 开关并填 `backendUrl`
- [ ] 需要统计：在 `src/config.ts` 的 `analytics` 里填自己的 umami 地址

## 关于第三方请求

模板里唯一指向作者域名的运行时请求是 `::music` 音乐卡片（向 `open.motues.top` 取歌曲信息），
地址在 `src/plugins/rehype-component-music-card.ts` 的 `MUSIC_API`，不写 `::music` 就不会触发。
统计脚本与评论后端默认都是关闭的，未配置时站点不会向任何第三方域名发请求。

## 参考

- [Astro](https://astro.build/) · [Momo 主题](https://github.com/Motues/Momo) · [主题文档](https://momo.motues.top/intro/config)
