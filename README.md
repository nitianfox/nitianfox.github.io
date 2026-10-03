# NTFOX

个人作品集 + 博客。静态站，基于 [Astro](https://astro.build/)，主题改造自 [Momo](https://github.com/Motues/Momo)（MIT）。
黑白为主、蓝色点缀，自带深色模式、本地搜索、RSS、归档、中英双语。

**改内容看 [`自定义指南.md`](./自定义指南.md)** —— 按「想改什么 → 改哪个文件」列好了。

## 线上地址

| 地址 | 说明 |
| --- | --- |
| **https://204041.xyz/** | 正式域名（Cloudflare Pages） |
| https://ntfox.pages.dev/ | 同一项目的默认域名 |
| https://nitianfox.github.io/ | GitHub Pages 镜像 |

三者内容一致：同一个仓库，每次推送各自构建（约 1~3 分钟）。canonical 与 sitemap 统一指向 `204041.xyz`。

## 发布

```powershell
cd D:\NTFOX
.\publish.ps1 "这次改了什么"      # 提交并推送，两个平台自动上线
```

## 本地

需要 Node.js ≥ 22 + pnpm。

```bash
pnpm install
pnpm dev      # 预览 http://localhost:4321
pnpm build    # 构建到 dist/（含搜索索引）
pnpm cms      # 可视化后台 http://localhost:5188
```

## 常改的地方

| 想改 | 去哪 |
| --- | --- |
| 站名、域名、头像、联系方式、主题开关 | `src/config.ts` |
| 文章 | `src/content/blog/<文章名>/zh-cn.md` |
| 作品文章与作品集数据 | `node script/portfolio/gen-posts.mjs --images`（素材在 `D:\工业设计作品集`） |
| 「关于」页 | `src/content/spec/about/zh-cn.md` |
| 站内文字（导航、页脚等） | `src/i18n/translation/` |

---

主题来自 [Momo](https://github.com/Motues/Momo)，MIT 协议。评论与统计未启用。
