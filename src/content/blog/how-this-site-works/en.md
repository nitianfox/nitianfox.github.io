---
title: How This Site Is Built
pubDate: 2026-10-03
description: The first post — what this site is for, why it is static, the stack and the ideas behind it, and the plan to host it on GitHub and Cloudflare.
category: Site
image: ""
draft: false
slugId: how-this-site-works
pinTop: 1
---

This is Cheng's static site, a home for practice projects and everyday tinkering notes. This first post is about the site itself: what goes here, how it is put together, and how it will be deployed.

## What goes here

- **Practice projects** — small things I build and experiments I run, whenever they are worth showing
- **Tinkering notes** — setting up environments, hitting walls, fixing them. The point is that future me can follow them and redo it
- **Everyday notes** — thoughts too small for their own post but too good to throw away

## Why static

The obvious win: **no server and no database**. Every page is already rendered into plain HTML at build time, so hosting is just a folder of files.

That means:

- **Hosting is basically free** — GitHub Pages or Cloudflare Pages can serve it as is
- **It is fast** — no backend queries, no database round trips; a CDN just hands out static files
- **It is hard to break** — nothing to maintain, nothing to upgrade; if a host dies, upload the folder somewhere else
- **It is easy to back up** — the whole site is Markdown plus images, and with git the full history comes along

The trade-off is **no backend**: comments, likes and anything server-side either get dropped or outsourced to a third party. This site currently has comments off.

## Under the hood: what a build actually does

Writing a post means writing Markdown — one folder per post, one file per language:

```text
src/content/blog/how-this-site-works/
├── zh-cn.md
└── en.md
```

A frontmatter block at the top carries the metadata:

```yaml
---
title: How This Site Is Built
pubDate: 2026-10-03
description: One-line summary
category: Site
slugId: how-this-site-works
pinTop: 1
---
```

Then a single build step (`pnpm build`) does four things:

1. **Compiles Markdown into HTML** — headings, code blocks, tables and math are all resolved at build time, so the output is static pages with no JavaScript by default.
2. **Loads JS only where something is interactive** — the search box, table of contents and archive filters are Svelte components loaded on demand. The "islands" approach keeps the static text untouched.
3. **Scans the generated pages and builds a search index** — search runs entirely in the browser against a local index. No search service, no requests leaving the page.
4. **Emits `sitemap.xml`, `rss.xml` and `robots.txt`** as build artifacts, so there is nothing to maintain by hand.

What is left in `dist/` is a folder that any static host can serve.

Navigation gets extra treatment: clicking a link does not reload the whole page — the new page is fetched and only the content area is swapped, with fade transitions and hover prefetching. Images also get a blurred placeholder generated at build time, so a slow image never shows up as a blank box.

Styling is Tailwind plus a set of CSS variables; the light and dark palettes live in one file, so recolouring never means digging through components. The site is bilingual: `/` is Chinese and `/en/` is English.

## Deployment plan

Three layers:

- **Code** on GitHub — every change is recorded, and mistakes can be rolled back
- **The site** on GitHub Pages or Cloudflare Pages — push and it builds and publishes `dist/` automatically
- **Cloudflare** for the domain and caching — DNS plus a CDN in front

Since the output is purely static, any of those layers can be swapped: move `dist/` somewhere else and no code changes.

Two details to handle at launch: point the site URL in the build config at the real domain (otherwise sitemap, RSS and share cards still link to localhost), and if the site ends up under a subpath like `username.github.io/repo`, configure a path prefix.

## What comes next

Whatever I actually do next — one post at a time, in the order it happens. The archive page groups posts by year automatically, so there is no index to maintain.
