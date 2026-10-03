// 把工业设计作品集（D:\工业设计作品集）的每个作品生成为一篇博客文章，并产出作品集页面数据。
//
//   node script/portfolio/gen-posts.mjs            # 生成（已存在的文章默认跳过，不覆盖手改内容）
//   node script/portfolio/gen-posts.mjs --force    # 连已存在的文章一起重建
//   node script/portfolio/gen-posts.mjs --dry      # 只看清单，不写文件
//   $env:PORTFOLIO_SRC='D:\别的目录'; node script/portfolio/gen-posts.mjs
//
// 做三件事：
//   1. src/content/blog/works/<编号>/zh-cn.md    每个作品一篇文章（含封面与预览图）
//   2. public/works/<编号>.jpg                    作品集网格用的封面（sharp 压到 800px）
//   3. src/data/portfolio.json                    作品集页面读的数据
//
// 时间取「原始源文件的修改时间」的区间：完成时间 = 最晚那个（作为 pubDate），
// 整理作品集当天（CUT 之前一天之后）动过的文件不算创作时间。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, '..', '..');
const SRC = process.env.PORTFOLIO_SRC || 'D:\\工业设计作品集';
const WEB = path.join(SRC, '_网页数据');
const BLOG = path.join(PROJECT, 'src', 'content', 'blog', 'works');
const PUBLIC_WORKS = path.join(PROJECT, 'public', 'works');
const DATA_OUT = path.join(PROJECT, 'src', 'data', 'portfolio.json');
const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');
const CUT = new Date('2026-10-03T00:00:00').getTime(); // 作品集整理当天

if (!fs.existsSync(path.join(WEB, 'works.json'))) {
  console.error(`找不到 ${path.join(WEB, 'works.json')}`);
  console.error('用 PORTFOLIO_SRC 指定作品集目录（应包含 _网页数据\\works.json）');
  process.exit(1);
}

const works = JSON.parse(fs.readFileSync(path.join(WEB, 'works.json'), 'utf8')).works;

// ---------- 时间：优先原始源文件的 mtime，回退到作品集里的副本 ----------
function sourceTimes(w) {
  const out = [];
  const cands = [...(w.files ?? []), ...(w.excluded ?? [])].map((f) => f.src).filter(Boolean);
  for (const p of cands) {
    try {
      const st = fs.statSync(p);
      if (st.isFile() && st.mtimeMs < CUT) out.push(st.mtimeMs);
    } catch { /* 原文件可能已不在 */ }
  }
  if (out.length) return out;
  const walk = (d) => {
    let ents;
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (!/说明\.md$/i.test(e.name)) {
        try { const st = fs.statSync(p); if (st.isFile() && st.mtimeMs < CUT) out.push(st.mtimeMs); } catch { /* ignore */ }
      }
    }
  };
  walk(path.join(SRC, w.path ?? ''));
  return out;
}

const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const mb = (b) => (b / 1048576).toFixed(1);

// ---------- 每个作品挑图：封面 + 均匀采样的 3 张（没图就用视频封面帧） ----------
function pickImages(w) {
  const thumbs = (w.images ?? []).map((i) => i.thumb).filter(Boolean);
  const posters = (w.videos ?? []).map((v) => v.poster).filter(Boolean);
  const pool = thumbs.length ? thumbs : posters;
  const cover = w.cover && fs.existsSync(path.join(SRC, w.cover)) ? w.cover : pool[0];
  const rest = pool.filter((t) => t !== cover);
  const need = Math.min(3, rest.length);
  const picked = [];
  for (let i = 0; i < need; i++) picked.push(rest[Math.floor(((i + 1) * rest.length) / (need + 1))]);
  return [cover, ...picked].filter(Boolean);
}

fs.mkdirSync(BLOG, { recursive: true });
fs.mkdirSync(PUBLIC_WORKS, { recursive: true });
fs.mkdirSync(path.dirname(DATA_OUT), { recursive: true });

const byCategory = new Map();
const report = [];

for (const w of works) {
  const times = sourceTimes(w);
  const minMs = times.length ? Math.min(...times) : null;
  const maxMs = times.length ? Math.max(...times) : null;
  const doneDate = maxMs ? iso(maxMs) : `${w.year || '2026'}-01-01`.slice(0, 10);
  const span = minMs && maxMs ? `${iso(minMs)} ～ ${iso(maxMs)}` : (w.year || '—');

  const postDir = path.join(BLOG, w.id);
  // 默认不覆盖已经存在的文章：手改过的正文、加过的图都不会被冲掉（要重建加 --force）
  const mdPath = path.join(postDir, 'zh-cn.md');
  const skipPost = fs.existsSync(mdPath) && !FORCE;
  const imgs = pickImages(w);
  const copied = [];

  if (!DRY && !skipPost) {
    fs.mkdirSync(postDir, { recursive: true });
    for (const f of fs.readdirSync(postDir)) {
      if (/\.(jpg|png|jpeg|webp)$/i.test(f)) fs.rmSync(path.join(postDir, f), { force: true });
    }
  }

  for (let i = 0; i < imgs.length; i++) {
    const srcAbs = path.join(SRC, imgs[i]);
    if (!fs.existsSync(srcAbs)) continue;
    const name = i === 0 ? 'cover.jpg' : `${String(i).padStart(2, '0')}.jpg`;
    copied.push(name);
    if (!DRY && !skipPost) fs.copyFileSync(srcAbs, path.join(postDir, name));
  }

  // 作品集网格封面：压到 800px，省流量
  const coverRel = imgs[0];
  const publicCover = coverRel ? `/works/${w.id}.jpg` : '';
  if (coverRel && !DRY) {
    const srcAbs = path.join(SRC, coverRel);
    if (fs.existsSync(srcAbs)) {
      await sharp(srcAbs)
        .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82, progressive: true })
        .toFile(path.join(PUBLIC_WORKS, `${w.id}.jpg`));
    }
  }

  const tools = (w.tools ?? []).join(' / ');
  const tags = (w.tags ?? []).join(' · ');
  const desc = (w.desc ?? '').trim();
  const bodyImgs = copied.slice(1).map((n) => `![${w.title}](./${n})`).join('\n');

  const md = `---
title: ${w.title}
pubDate: ${doneDate}
description: ${w.subtitle || desc.slice(0, 60)}
category: ${w.category}
image: ${copied.length ? '"./cover.jpg"' : '""'}
draft: false
slugId: works/${w.id}
pinTop: 0
---

> **分类**：${w.category} ｜ **编号**：${w.id} ｜ **完成时间**：${doneDate}
>
> **使用工具**：${tools || '—'}
>
> **标签**：${tags || '—'}

## 说明

${desc || '（暂无说明）'}

## 预览

${bodyImgs || '（这个作品留下的主要是视频，预览图待补）'}

## 素材

| 项目 | 数量 |
| --- | --- |
| 文件 | ${w.counts?.files ?? 0} 个 / ${mb(w.counts?.bytes ?? 0)} MB |
| 图片 | ${w.counts?.images ?? 0} 张 |
| 视频 | ${w.counts?.videos ?? 0} 段 |

制作时间跨度：${span}
`;

  if (!DRY && !skipPost) fs.writeFileSync(mdPath, md, 'utf8');

  const item = {
    id: w.id,
    slug: `works/${w.id}`,
    title: w.title,
    subtitle: w.subtitle ?? '',
    year: w.year ?? '',
    doneDate,
    span,
    tools: w.tools ?? [],
    tags: w.tags ?? [],
    cover: publicCover,
    files: w.counts?.files ?? 0,
    sizeMB: Number(mb(w.counts?.bytes ?? 0)),
    images: w.counts?.images ?? 0,
    videos: w.counts?.videos ?? 0,
  };
  if (!byCategory.has(w.category)) byCategory.set(w.category, []);
  byCategory.get(w.category).push(item);
  report.push({ id: w.id, doneDate, span, copied: copied.length, cat: w.category, title: w.title, skipped: skipPost });
}

const order = ['平面设计', '三维建模', '产品渲染', '场景动画'];
const categories = [...byCategory.keys()]
  .sort((a, b) => order.indexOf(a) - order.indexOf(b))
  .map((k) => ({
    name: k,
    count: byCategory.get(k).length,
    works: byCategory.get(k).sort((a, b) => b.doneDate.localeCompare(a.doneDate)),
  }));

if (!DRY) {
  fs.writeFileSync(DATA_OUT, JSON.stringify({
    generated: new Date().toISOString().slice(0, 19).replace('T', ' '),
    source: SRC,
    total: works.length,
    categories,
  }, null, 2), 'utf8');
}

report.sort((a, b) => a.doneDate.localeCompare(b.doneDate));
const skipped = report.filter((r) => r.skipped).length;
console.log(`${DRY ? '[dry] 预览' : '已处理'} ${report.length} 篇文章 -> ${path.relative(PROJECT, BLOG)}` +
  (skipped ? `（其中 ${skipped} 篇已存在、已跳过；要重建加 --force）` : ''));
for (const r of report) {
  console.log(`  ${r.id}  ${r.doneDate}  ${r.copied}图  ${r.cat.padEnd(5)}  ${r.title}${r.skipped ? '  [跳过]' : ''}`);
}
console.log(`\n作品集数据 -> ${path.relative(PROJECT, DATA_OUT)}（${categories.map((c) => `${c.name} ${c.count}`).join(' / ')}）`);
console.log(`作品集封面 -> ${path.relative(PROJECT, PUBLIC_WORKS)}（${fs.readdirSync(PUBLIC_WORKS).length} 个文件）`);
