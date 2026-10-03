// 把「单渲染作品集（03-28）」的图按源文件时间切成一份份，生成 extra-entries.json 片段。
//   node script/portfolio/make-render-split.mjs [--gap 天]
// 默认按「相邻图片间隔超过 45 天」切段，这样同一批出图会归到一份。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, '..', '..');
const SRC = process.env.PORTFOLIO_SRC || 'D:\\工业设计作品集';
const WEIGHTS_JSON = path.join(HERE, 'weights.json');
const EXTRA = path.join(HERE, 'extra-entries.json');
const PARENT = process.argv.includes('--parent') ? process.argv[process.argv.indexOf('--parent') + 1] : '03-28';
const gapIdx = process.argv.indexOf('--gap');
const GAP_DAYS = gapIdx >= 0 ? Number(process.argv[gapIdx + 1]) : 45;

const works = JSON.parse(fs.readFileSync(path.join(SRC, '_网页数据', 'works.json'), 'utf8')).works;
const parent = works.find((w) => w.id === PARENT);
if (!parent) { console.error('找不到 ' + PARENT); process.exit(1); }

const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

// 每张图：缩略图路径 + 源文件时间
const rows = [];
for (const i of parent.images ?? []) {
  if (!i.thumb) continue;
  let ms = null;
  const abs = path.join(SRC, i.rel);
  try { ms = fs.statSync(abs).mtimeMs; } catch { /* ignore */ }
  if (ms == null) {
    const f = (parent.files ?? []).find((x) => (x.path || '').endsWith(path.basename(i.rel)));
    if (f?.src) { try { ms = fs.statSync(f.src).mtimeMs; } catch { /* ignore */ } }
  }
  rows.push({ name: i.name, thumb: i.thumb, ms, date: ms ? iso(ms) : null });
}
rows.sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')));

// 按时间切段
const groups = [];
for (const r of rows) {
  const last = groups[groups.length - 1];
  const prevMs = last?.items[last.items.length - 1].ms;
  const tooFar = last && r.ms && prevMs && (r.ms - prevMs) / 86400000 > GAP_DAYS;
  if (!last || tooFar) groups.push({ items: [r] });
  else last.items.push(r);
}

const cn = (d) => { const [y, m] = d.split('-'); return `${y} 年 ${Number(m)} 月`; };
const entries = groups.map((g, idx) => {
  const dates = g.items.map((x) => x.date).filter(Boolean);
  const from = dates[0] ?? '2024-01-01';
  const to = dates[dates.length - 1] ?? from;
  const id = `${PARENT}-${String(idx + 1).padStart(2, '0')}`;
  return {
    id,
    title: `${from.slice(0, 4)} 年 ${Number(from.slice(5, 7))} 月 · 产品渲染（${g.items.length} 件）`,
    category: '产品渲染',
    weight: g.items.length >= 6 ? 4 : 3,
    date: to,
    span: from === to ? from : `${from} ～ ${to}`,
    desc: `这段时间出的一批单体渲染，共 ${g.items.length} 张。从原作品集「单渲染作品集」按出图时间拆出来的一份。`,
    tools: parent.tools ?? [],
    tags: ['渲染', '产品', '单体'],
    images: g.items.map((x) => x.thumb),
    parent: PARENT,
    primary: true,
    autoSplit: true,
  };
});

// 只写「自动拆分」的部分，保留手工加过的条目
let cfg = { note: '按时间拆分出来的条目（由 make-render-split.mjs 生成，可手工改标题与描述）', entries: [] };
try {
  const prev = JSON.parse(fs.readFileSync(EXTRA, 'utf8'));
  cfg.entries = (prev.entries ?? []).filter((e) => !e.autoSplit);
} catch { /* 首次 */ }
cfg.entries.push(...entries);
fs.writeFileSync(EXTRA, JSON.stringify(cfg, null, 2), 'utf8');

console.log(`按「间隔 > ${GAP_DAYS} 天」切分：${rows.length} 张 -> ${entries.length} 份`);
for (const e of entries) console.log(`  ${e.id}  ${e.title}  ${e.weight}分  ${e.images.length} 图  ${e.span}`);
console.log(`\n写入 ${path.relative(PROJECT, EXTRA)}（自动拆分 ${entries.length} 条）`);
