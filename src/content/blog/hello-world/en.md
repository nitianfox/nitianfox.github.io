---
title: Hello, NTFOX
pubDate: 2026-10-03
description: The first post on this blog — what the site is, and how to write the next one.
category: Notes
image: ""
draft: false
slugId: hello-world
pinTop: 1
---

This is NTFOX's blog, and this is the first post.

The site is built with [Astro](https://astro.build/) on top of a theme adapted from [Momo](https://github.com/Motues/Momo): a minimal black-and-white design with blue accents, dark mode, local search, RSS and an archive page. Every page is generated at build time, so hosting needs no server and no database.

## Writing the next post

Posts live in `src/content/blog/`, one folder per post, with a file per language:

```text
src/content/blog/hello-world/
├── zh-cn.md
└── en.md
```

Or use the bundled CLI:

```bash
pnpm momo new my/post/path     # scaffold a post with frontmatter
pnpm dev                       # preview at http://localhost:4321
pnpm build                     # build the static site into dist/
pnpm cms                       # visual editor at http://localhost:5188
```

## What you can use in a post

Code blocks with highlighting and line numbers:

```js
const posts = await getCollection('blog');
console.log(`${posts.length} posts in total`);
```

Callouts (`note` / `tip` / `important` / `caution` / `warning`):

:::note
This is a note block — handy for steps and caveats.
:::

:::tip
This is a tip block — for small tricks.
:::

Tables:

| Effect | Syntax |
| --- | --- |
| Collapsible block | `:::fold` |
| Link in a new tab | `[text](url){target="_blank"}` |
| Inline math | `$E = mc^2$` |

Math, the image lightbox and automatic image collages all work too — see the theme repository for the full syntax.

## Next steps

- Point `rootSiteUrl` in `src/config.ts` at your real domain (SEO, sitemap and RSS all use it)
- Replace the avatar `src/assets/avatar.png` and `public/favicon/favicon.ico`
- For a full-screen photo cover: drop a photo into `public/cover.jpg` and set `theme.photoCover.enable` to `true`
