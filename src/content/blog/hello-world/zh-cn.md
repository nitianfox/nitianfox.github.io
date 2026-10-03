---
title: 你好，NTFOX
pubDate: 2026-10-03
description: 这个博客的第一篇文章：站点搭好了，聊聊它长什么样、下一篇怎么写。
category: 随笔
image: ""
draft: false
slugId: hello-world
pinTop: 1
---

这里是 NTFOX 的博客，第一篇文章。

站点用 [Astro](https://astro.build/) 构建，主题改造自 [Momo](https://github.com/Motues/Momo)：黑白为主、蓝色点缀的极简设计，自带深色模式、本地搜索、RSS 和文章归档。所有页面都是构建期生成的静态文件，托管时不需要服务器，也不需要数据库。

## 下一篇怎么写

文章放在 `src/content/blog/` 下，一篇一个文件夹，按语言放 `zh-cn.md` 和 `en.md`：

```text
src/content/blog/hello-world/
├── zh-cn.md
└── en.md
```

也可以直接用主题自带的命令行：

```bash
pnpm momo new 我的文章路径    # 按模板新建一篇（frontmatter 会自动填好）
pnpm dev                     # 本地预览 http://localhost:4321
pnpm build                   # 构建静态站点到 dist/
pnpm cms                     # 打开可视化后台 http://localhost:5188
```

## 正文里能用的东西

代码块带高亮和行号：

```js
const posts = await getCollection('blog');
console.log(`共 ${posts.length} 篇文章`);
```

提示块（`note` / `tip` / `important` / `caution` / `warning`）：

:::note
这是 note 块，写步骤、注意事项很合适。
:::

:::tip
这是 tip 块，用来放小技巧。
:::

表格：

| 想要的效果 | 写法 |
| --- | --- |
| 折叠块 | `:::fold` |
| 新标签页链接 | `[文字](url){target="_blank"}` |
| 行内公式 | `$E = mc^2$` |

公式、图片灯箱、连续图片自动拼网格这些也都支持，完整语法见主题仓库的文档。

## 接下来要做的

- 把 `src/config.ts` 里的 `rootSiteUrl` 改成真实域名（SEO、sitemap、RSS 都用它）
- 换上自己的头像 `src/assets/avatar.png` 和 `public/favicon/favicon.ico`
- 想开首页整屏照片封面：照片放进 `public/cover.jpg`，再把 `theme.photoCover.enable` 改成 `true`

就这些，开张。
