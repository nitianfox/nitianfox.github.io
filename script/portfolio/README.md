# script/portfolio —— 生成器已移除，这里只剩两份存档

**2026-10-09：作品集生成器整体移除**（`gen-posts.mjs`、`gen-boards.mjs`、`make-render-split.mjs`
以及它们的配置 `merges.json` / `manual-images.json` / `extra-images.json` / `extra-entries.json` 全删）。
原因：它依赖的素材目录在 2026-10-04 的清理里被删了，再跑会改坏已经上线的数据
（清空 6 个条目的封面、把 `03-27` / `03-30` 手工打码的封面用源图刷掉）。

现在作品集是**手维护**的：

| 要改什么 | 改哪 |
| --- | --- |
| 条目数据（标题 / 时间 / 工具 / 标签 / 封面 / **权重**） | `src/data/portfolio.json` |
| 条目正文 | `src/content/blog/works/<编号>/zh-cn.md` |
| 条目配图 | `src/content/blog/works/<编号>/cover.jpg` + `01.jpg`… |
| 列表卡片封面 | `public/works/thumb/<编号>.webp`（400px）+ `public/works/<编号>.jpg`（800px） |
| 精选名额、分区顺序 | `src/pages/[...locale]/works.astro` 的 `FEATURED` / `ALL_ORDER` |

**本目录剩下两个文件只作历史记录，没有任何代码读它们：**

- `weights.json` —— 2026-10-03 打分问卷的原始结果（当时的权重表）
- `sections.json` —— 当时的分区顺序与归类规则

要看细节就读仓库根目录的 `给AI的操作说明.md` 第四节、`自定义指南.md` 第 12 / 13 节。
