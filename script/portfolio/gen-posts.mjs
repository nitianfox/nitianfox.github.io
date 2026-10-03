// 把工业设计作品集（D:\工业设计作品集）按「权重表」生成/维护成博客文章 + 作品集页数据。
//
//   node script/portfolio/gen-posts.mjs            # 生成（已存在的文章默认跳过，不覆盖手改内容）
//   node script/portfolio/gen-posts.mjs --force    # 连已存在的文章一起重建
//   node script/portfolio/gen-posts.mjs --dry      # 只看清单，不写文件
//   $env:PORTFOLIO_SRC='D:\别的目录'; node script/portfolio/gen-posts.mjs
//
// 权重来自 script/portfolio/weights.json（0 = 不要，文章/配图/作品集条目一起删）：
//   5 代表作 8 图 · 4 重点项目 6 图 · 3 正常收录 4 图 · 2 简单记录 2 图 · 1 只留档 1 图
//
// 做四件事：
//   1. 清理权重为 0 的作品（删文章目录与作品集封面）
//   2. src/content/blog/works/<编号>/zh-cn.md   按权重重写正文与配图
//   3. public/works/<编号>.jpg                  作品集网格封面（sharp 压到 800px）
//   4. src/data/portfolio.json                  作品集页面读的数据（含权重）
//
// 时间取「原始源文件修改时间」的区间：完成时间 = 最晚那天（作为 pubDate）。
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
const WEIGHTS = path.join(HERE, 'weights.json');
const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');
const CUT = new Date('2026-10-03T00:00:00').getTime(); // 作品集整理当天

for (const p of [path.join(WEB, 'works.json'), WEIGHTS]) {
  if (!fs.existsSync(p)) {
    console.error(`找不到 ${p}${p.endsWith('works.json') ? '（可用 PORTFOLIO_SRC 指定作品集目录）' : ''}`);
    process.exit(1);
  }
}

const works = JSON.parse(fs.readFileSync(path.join(WEB, 'works.json'), 'utf8')).works;
const weights = JSON.parse(fs.readFileSync(WEIGHTS, 'utf8')).works;
const weightOf = (id) => (id in weights ? weights[id] : 3);

// 每级权重的配图总数（含封面）与正文结构
const PLAN = {
  5: { images: 8, previews: true, table: true, composition: true, span: true, process: true },
  4: { images: 6, previews: true, table: true, composition: true, span: true, process: false },
  3: { images: 4, previews: true, table: true, composition: true, span: false, process: false },
  2: { images: 2, previews: true, table: true, composition: false, span: false, process: false },
  1: { images: 1, previews: false, table: false, composition: false, span: false, process: false },
};

const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const mb = (b) => (b / 1048576).toFixed(1);

// ---------- 时间：优先原始源文件 mtime，回退到作品集里的副本 ----------
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

// ---------- 挑图：封面 + 均匀采样的其余（没图就用视频封面帧） ----------
function pickImages(w, want) {
  const thumbs = (w.images ?? []).map((i) => i.thumb).filter(Boolean);
  const posters = (w.videos ?? []).map((v) => v.poster).filter(Boolean);
  const pool = thumbs.length ? thumbs : posters;
  const cover = w.cover && fs.existsSync(path.join(SRC, w.cover)) ? w.cover : pool[0];
  const rest = pool.filter((t) => t !== cover);
  const need = Math.max(0, Math.min(want - 1, rest.length));
  const picked = [];
  for (let i = 0; i < need; i++) picked.push(rest[Math.floor(((i + 1) * rest.length) / (need + 1))]);
  return [cover, ...picked].filter(Boolean);
}

// ---------- 文件构成（按扩展名归类，全部来自真实文件清单） ----------
const EXT_GROUP = [
  ['图片', /\.(png|jpe?g|webp|tiff?|bmp|gif|psd|ai|cdr|svg)$/i],
  ['三维工程', /\.(blend\d?|3dm|3dmbak|sldprt|sldasm|step|stp|igs|iges|obj|stl|fbx|ply|plasticity|dwg|dxf|ksp|spp|ztl|mtl|x_t)$/i],
  ['视频/剪辑', /\.(mp4|mov|avi|mkv|wmv|flv|prproj|aep|veg)$/i],
  ['文档', /\.(docx?|pdf|pptx?|txt|md|rtf|xlsx?|csv)$/i],
];
function composition(w) {
  const all = [...(w.files ?? []), ...(w.excluded ?? [])].map((f) => f.path || f.name || '').filter(Boolean);
  if (!all.length) return '';
  const counts = new Map();
  let other = 0;
  for (const f of all) {
    const g = EXT_GROUP.find(([, re]) => re.test(f));
    if (g) counts.set(g[0], (counts.get(g[0]) ?? 0) + 1);
    else other++;
  }
  const parts = EXT_GROUP.map(([name]) => [name, counts.get(name) ?? 0])
    .filter(([, n]) => n > 0)
    .map(([name, n]) => `${name} ${n} 个`);
  if (other) parts.push(`其它 ${other} 个`);
  return parts.join(' · ');
}

// ---------- 生成 ----------
fs.mkdirSync(BLOG, { recursive: true });
fs.mkdirSync(PUBLIC_WORKS, { recursive: true });
fs.mkdirSync(path.dirname(DATA_OUT), { recursive: true });

// 先清理权重为 0 的作品
const removed = [];
for (const w of works) {
  if (weightOf(w.id) > 0) continue;
  removed.push(w.id);
  if (DRY) continue;
  const dir = path.join(BLOG, w.id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  const cover = path.join(PUBLIC_WORKS, `${w.id}.jpg`);
  if (fs.existsSync(cover)) fs.rmSync(cover, { force: true });
}
if (removed.length) console.log(`按权重表删除 ${removed.length} 件：${removed.join(', ')}\n`);

const byCategory = new Map();
const report = [];

for (const w of works) {
  const weight = weightOf(w.id);
  if (weight <= 0) continue;
  const plan = PLAN[weight] ?? PLAN[3];

  const times = sourceTimes(w);
  const minMs = times.length ? Math.min(...times) : null;
  const maxMs = times.length ? Math.max(...times) : null;
  const doneDate = maxMs ? iso(maxMs) : `${w.year || '2026'}-01-01`.slice(0, 10);
  const span = minMs && maxMs ? `${iso(minMs)} ～ ${iso(maxMs)}` : (w.year || '—');

  const postDir = path.join(BLOG, w.id);
  const mdPath = path.join(postDir, 'zh-cn.md');
  const skipPost = fs.existsSync(mdPath) && !FORCE;

  const imgs = pickImages(w, plan.images);
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

  // 作品集网格封面（总是刷新）
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

  // ---- 正文 ----
  const tools = (w.tools ?? []).join(' / ');
  const tags = (w.tags ?? []).join(' · ');
  const desc = (w.desc ?? '').trim();
  const files = w.counts?.files ?? 0;
  const size = mb(w.counts?.bytes ?? 0);
  const cImages = w.counts?.images ?? 0;
  const cVideos = w.counts?.videos ?? 0;
  const comp = composition(w);

  const body = [];
  body.push(`> **分类**：${w.category} ｜ **编号**：${w.id} ｜ **完成时间**：${doneDate}`);
  body.push('>');
  body.push(`> **使用工具**：${tools || '—'}`);
  body.push('>');
  body.push(`> **标签**：${tags || '—'}`);
  body.push('');
  body.push('## 说明');
  body.push('');
  body.push(desc || '（暂无说明）');
  body.push('');

  if (plan.previews && copied.length > 1) {
    body.push('## 预览');
    body.push('');
    for (const n of copied.slice(1)) body.push(`![${w.title}](./${n})`);
    body.push('');
  }

  if (plan.table) {
    body.push('## 素材');
    body.push('');
    body.push('| 项目 | 数量 |');
    body.push('| --- | --- |');
    body.push(`| 文件 | ${files} 个 / ${size} MB |`);
    body.push(`| 图片 | ${cImages} 张 |`);
    body.push(`| 视频 | ${cVideos} 段 |`);
    if (plan.composition && comp) body.push(`| 文件构成 | ${comp} |`);
    body.push('');
    if (plan.span) body.push(`制作时间跨度：${span}`);
  } else {
    body.push(`*文件 ${files} 个 / ${size} MB · 制作于 ${doneDate}*`);
  }

  if (plan.process) {
    body.push('');
    body.push('## 过程与复盘');
    body.push('');
    body.push('<!-- 待补：这一段等程口述制作过程（怎么起手、改了几版、卡在哪、最后怎么定稿）后再写 -->');
    body.push('（这一段等作者口述制作过程与复盘后补上。）');
  }

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

${body.join('\n')}
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
    weight,
    files,
    sizeMB: Number(size),
    images: cImages,
    videos: cVideos,
  };
  if (!byCategory.has(w.category)) byCategory.set(w.category, []);
  byCategory.get(w.category).push(item);
  report.push({ id: w.id, weight, doneDate, span, copied: copied.length, cat: w.category, title: w.title, skipped: skipPost });
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
    total: report.length,
    categories,
  }, null, 2), 'utf8');
}

console.log(`权重表：${Object.values(weights).filter((x) => x > 0).length} 件保留 / ${removed.length} 件删除\n`);
report.sort((a, b) => a.id.localeCompare(b.id));
const skipped = report.filter((r) => r.skipped).length;
console.log(`${DRY ? '[dry] 预览' : '已处理'} ${report.length} 篇文章 -> ${path.relative(PROJECT, BLOG)}` +
  (skipped ? `（${skipped} 篇已存在、已跳过；要重建加 --force）` : ''));
for (const r of report) {
  console.log(`  ${r.id}  ${r.weight}分  ${r.doneDate}  ${r.copied}图  ${r.cat.padEnd(5)}  ${r.title}${r.skipped ? '  [跳过]' : ''}`);
}
const dist = [5, 4, 3, 2, 1].map((k) => `${k}分 ${report.filter((r) => r.weight === k).length} 件`).join(' · ');
console.log(`\n分布：${dist}`);
console.log(`作品集数据 -> ${path.relative(PROJECT, DATA_OUT)}（${categories.map((c) => `${c.name} ${c.count}`).join(' / ')}）`);
console.log(`作品集封面 -> ${path.relative(PROJECT, PUBLIC_WORKS)}（${fs.readdirSync(PUBLIC_WORKS).length} 个文件）`);
