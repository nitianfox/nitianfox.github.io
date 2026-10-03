// 把工业设计作品集（D:\工业设计作品集）按「权重表 + 合并规则 + 配图选择」生成/维护成博客文章 + 作品集页数据。
//
//   node script/portfolio/gen-posts.mjs            # 生成（已存在的文章默认跳过，不覆盖手改内容）
//   node script/portfolio/gen-posts.mjs --force    # 连已存在的文章一起重建
//   node script/portfolio/gen-posts.mjs --dry      # 只看清单，不写文件
//   $env:PORTFOLIO_SRC='D:\别的目录'; node script/portfolio/gen-posts.mjs
//
// 三份配置：
//   weights.json          权重（0 = 不要；1-5 决定正文结构与配图数量）
//   merges.json           合并规则（「其实是一个项目」的多个条目并成一篇）
//   D:\agent\image-selection.json   配图挑选台保存的选择（有就优先用，没有就按默认规则挑）
//
// 做四件事：
//   1. 清理：权重 0 的、被合并掉的条目（文章目录 + 作品集封面一起删）
//   2. src/content/blog/works/<编号>/zh-cn.md   按权重写正文与配图
//   3. public/works/<编号>.jpg                  作品集网格封面（sharp 压到 800px）
//   4. src/data/portfolio.json                  作品集页数据（含权重/合并分组/客户）
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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
const MERGES = path.join(HERE, 'merges.json');
const MANUAL = path.join(HERE, 'manual-images.json');
const SELECTION = 'D:\\agent\\image-selection.json';
const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');
const IMAGES_ONLY = process.argv.includes('--images'); // 只按配图选择重做配图，正文一个字不动
const CUT = new Date('2026-10-03T00:00:00').getTime(); // 作品集整理当天

for (const p of [path.join(WEB, 'works.json'), WEIGHTS, MERGES]) {
  if (!fs.existsSync(p)) { console.error(`找不到 ${p}（works.json 可用 PORTFOLIO_SRC 指定目录）`); process.exit(1); }
}

const works = JSON.parse(fs.readFileSync(path.join(WEB, 'works.json'), 'utf8')).works;
const byId = new Map(works.map((w) => [w.id, w]));
const weights = JSON.parse(fs.readFileSync(WEIGHTS, 'utf8')).works;
const merges = JSON.parse(fs.readFileSync(MERGES, 'utf8'));
const groups = merges.groups ?? [];
const renames = merges.renames ?? {};
const groupOf = new Map(groups.map((g) => [g.id, g]));
const absorbed = new Set(groups.flatMap((g) => g.absorb));

let selection = null;
try { selection = JSON.parse(fs.readFileSync(SELECTION, 'utf8')); } catch { selection = null; }
if (selection) console.log(`读到配图选择：${SELECTION}（${Object.keys(selection.items ?? {}).length} 篇）`);

// 手工指定配图（桌面「暂定」文件夹），优先级最高；主目录取不到就依次回退
let manual = { dirs: [], items: {} };
try {
  const m = JSON.parse(fs.readFileSync(MANUAL, 'utf8'));
  manual = { dirs: [m.dir, ...(m.fallbacks ?? [])].filter(Boolean), items: m.items ?? {} };
  console.log(`读到手工配图：${MANUAL}（${Object.keys(manual.items).length} 篇）`);
  for (const d of manual.dirs) console.log(`  目录${fs.existsSync(d) ? '✓' : '✗'} ${d}`);
} catch { /* 没有就跳过 */ }
if (selection || Object.keys(manual.items).length) console.log('');

// 每级权重的正文结构与配图总数（含封面）
const PLAN = {
  5: { images: 8, previews: true, table: true, composition: true, span: true, process: true },
  4: { images: 6, previews: true, table: true, composition: true, span: true, process: false },
  3: { images: 4, previews: true, table: true, composition: true, span: false, process: false },
  2: { images: 2, previews: true, table: true, composition: false, span: false, process: false },
  1: { images: 1, previews: false, table: false, composition: false, span: false, process: false },
};

const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const mb = (b) => (b / 1048576).toFixed(1);

// ---------- 时间：优先原始源文件 mtime ----------
function sourceTimes(w) {
  const out = [];
  for (const p of [...(w.files ?? []), ...(w.excluded ?? [])].map((f) => f.src).filter(Boolean)) {
    try { const st = fs.statSync(p); if (st.isFile() && st.mtimeMs < CUT) out.push(st.mtimeMs); } catch { /* 原文件可能已不在 */ }
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

// ---------- 候选图 ----------
function candidatesOf(parts) {
  const out = [];
  for (const w of parts) {
    for (const i of w.images ?? []) if (i.thumb) out.push({ thumb: i.thumb, name: i.name, rel: i.rel, part: w.id, poster: false });
    for (const v of w.videos ?? []) if (v.poster) out.push({ thumb: v.poster, name: v.name + '（视频封面帧）', rel: v.rel, part: w.id, poster: true });
  }
  return out;
}

// 「像参考图/下载图」：目录名或文件名线索（与配图挑选台保持一致）
const REF_DIR = /参考|素材|大图预览|截图|screen|网页|网络/i;
const REF_NAME = [/@\d+w/i, /_\d+w(_\d+o)?/i, /\bw_\d+\.(jpe?g|png|webp)$/i, /src=http/i, /^https?_/i, /https?__/i,
  /\bu=\d+,\d+/i, /OIP|download|zhimg|alicdn|xhscdn|hbimg|baidu|sogou|花瓣|pinimg/i,
  /^[0-9a-f]{24,}[.\-]/i, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i, /^E-\d{4,}-/i, /屏幕截图|screenshot/i];

function pickByRule(cands, budget) {
  const good = cands.filter((c) => !REF_DIR.test(c.thumb) && !REF_NAME.some((re) => re.test(c.name)));
  const pool = good.length ? good : cands;
  // 封面优先「渲染预览 / 成片与输出 / 输出」这些目录
  const score = (c) => (/渲染预览|成片与输出|\\输出\\|大图预览/.test(c.thumb) ? 0 : 1);
  const sorted = [...pool].sort((a, b) => score(a) - score(b));
  const cover = sorted[0];
  const rest = pool.filter((c) => c !== cover);
  const need = Math.max(0, budget - (cover ? 1 : 0));
  const picked = [];
  for (let i = 0; i < Math.min(need, rest.length); i++) picked.push(rest[Math.floor(((i + 1) * rest.length) / (Math.min(need, rest.length) + 1))]);
  return [cover, ...picked].filter(Boolean).map((c) => c.thumb);
}

const EXT_GROUP = [
  ['图片', /\.(png|jpe?g|webp|tiff?|bmp|gif|psd|ai|cdr|svg)$/i],
  ['三维工程', /\.(blend\d?|3dm|3dmbak|sldprt|sldasm|step|stp|igs|iges|obj|stl|fbx|ply|plasticity|dwg|dxf|ksp|spp|ztl|mtl|x_t)$/i],
  ['视频/剪辑', /\.(mp4|mov|avi|mkv|wmv|flv|prproj|aep|veg)$/i],
  ['文档', /\.(docx?|pdf|pptx?|txt|md|rtf|xlsx?|csv)$/i],
];
function composition(files) {
  const counts = new Map();
  let other = 0;
  for (const f of files) {
    const name = f.path || f.name || '';
    const g = EXT_GROUP.find(([, re]) => re.test(name));
    if (g) counts.set(g[0], (counts.get(g[0]) ?? 0) + 1);
    else other++;
  }
  const parts = EXT_GROUP.map(([n]) => [n, counts.get(n) ?? 0]).filter(([, n]) => n > 0).map(([n, c]) => `${n} ${c} 个`);
  if (other) parts.push(`其它 ${other} 个`);
  return parts.join(' · ');
}

// ---------- 跨项目串图剔除 ----------
// 同一张图（按内容哈希）如果也出现在「别的条目」里，就不许进这篇——康帕斯那篇混进雪花球/DNA 图就是这么来的。
// 例外：精选合集（下面 PRIMARY）与手工指定配图的条目不受限。
const PRIMARY = new Set(['03-27', '03-28', '04-39', '04-40']);
const entryIdOf = (id) => {
  for (const g of groups) if (g.absorb.includes(id)) return g.id;
  return id;
};
let hashEntries = null;
const hashCache = new Map();
function hashOfFile(p) {
  if (hashCache.has(p)) return hashCache.get(p);
  const h = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  hashCache.set(p, h);
  return h;
}
function getHashEntries() {
  if (hashEntries) return hashEntries;
  hashEntries = new Map();
  for (const w of works) {
    if ((weights[w.id] ?? 0) <= 0) continue;
    const ent = entryIdOf(w.id);
    for (const i of w.images ?? []) {
      if (!i.thumb) continue;
      const p = path.join(SRC, i.thumb);
      if (!fs.existsSync(p)) continue;
      const h = hashOfFile(p);
      if (!hashEntries.has(h)) hashEntries.set(h, new Set());
      hashEntries.get(h).add(ent);
    }
  }
  return hashEntries;
}
function isForeign(thumb, entryId) {
  if (PRIMARY.has(entryId)) return false;
  const p = path.join(SRC, thumb);
  if (!fs.existsSync(p)) return true;
  const set = getHashEntries().get(hashOfFile(p));
  if (!set) return false;
  for (const e of set) if (e !== entryId) return true;
  return false;
}

// 只更新文章里的「## 预览」小节，让图片行与磁盘上实际存在的图一致（正文其余部分一个字不动）
function syncPreviewSection(mdPath, title, previewNames) {
  if (!fs.existsSync(mdPath)) return false;
  const text = fs.readFileSync(mdPath, 'utf8');
  const lines = previewNames.map((n) => `![${title}](./${n})`).join('\n');
  const block = previewNames.length ? `## 预览\n\n${lines}\n\n` : '';
  const re = /## 预览\n\n(?:!\[[^\]]*\]\(\.\/\d\d\.jpg\)\n)+\n?/;
  let out;
  if (re.test(text)) {
    out = text.replace(re, block);
  } else if (block) {
    if (/## 素材\n/.test(text)) out = text.replace(/## 素材\n/, block + '## 素材\n');
    else if (/## 过程与复盘\n/.test(text)) out = text.replace(/## 过程与复盘\n/, block + '## 过程与复盘\n');
    else out = text.trimEnd() + '\n\n' + block;
  } else {
    return false;
  }
  out = out.replace(/\n{3,}/g, '\n\n');
  if (out === text) return false;
  fs.writeFileSync(mdPath, out, 'utf8');
  return true;
}

// ---------- 组装条目（合并后的）+ 清理 ----------
const removed = [];
for (const w of works) {
  const dead = (weights[w.id] ?? 0) <= 0 || absorbed.has(w.id);
  if (!dead) continue;
  removed.push({ id: w.id, why: absorbed.has(w.id) ? '并入' : '权重0' });
  if (DRY) continue;
  const dir = path.join(BLOG, w.id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  const cover = path.join(PUBLIC_WORKS, `${w.id}.jpg`);
  if (fs.existsSync(cover)) fs.rmSync(cover, { force: true });
}
if (removed.length) {
  const a = removed.filter((r) => r.why === '并入').map((r) => r.id);
  const b = removed.filter((r) => r.why === '权重0').map((r) => r.id);
  if (b.length) console.log(`权重 0 删除 ${b.length} 件：${b.join(', ')}`);
  if (a.length) console.log(`并入其它条目 ${a.length} 件：${a.join(', ')}`);
  console.log('');
}

const entries = [];
for (const w of works) {
  const weight = weights[w.id] ?? 0;
  if (weight <= 0 || absorbed.has(w.id)) continue;
  const g = groupOf.get(w.id);
  if (g) {
    const parts = (g.parts ?? []).map((p) => byId.get(p.id)).filter(Boolean);
    entries.push({ main: w, weight: g.weight ?? weight, title: renames[w.id] ?? g.title ?? w.title, category: g.category ?? w.category, group: g, parts });
  } else {
    entries.push({ main: w, weight, title: renames[w.id] ?? w.title, category: w.category, group: null, parts: [w] });
  }
}

fs.mkdirSync(BLOG, { recursive: true });
fs.mkdirSync(PUBLIC_WORKS, { recursive: true });
fs.mkdirSync(path.dirname(DATA_OUT), { recursive: true });

const byCategory = new Map();
const report = [];

for (const e of entries) {
  const { main, weight, title, category, group, parts } = e;
  const plan = PLAN[weight] ?? PLAN[3];

  // 时间：所有部分一起取
  const times = parts.flatMap(sourceTimes);
  const minMs = times.length ? Math.min(...times) : null;
  const maxMs = times.length ? Math.max(...times) : null;
  const doneDate = maxMs ? iso(maxMs) : `${main.year || '2026'}-01-01`.slice(0, 10);
  const span = minMs && maxMs ? `${iso(minMs)} ～ ${iso(maxMs)}` : (main.year || '—');

  const postDir = path.join(BLOG, main.id);
  const mdPath = path.join(postDir, 'zh-cn.md');
  const exists = fs.existsSync(mdPath);
  // 正文：默认不覆盖手改内容（--force 才重建；--images 时完全不碰）
  const writeMd = !DRY && !IMAGES_ONLY && (!exists || FORCE);
  // 配图：--images 时只重做配图；否则与正文一起（新建/--force）
  const writeImages = !DRY && (IMAGES_ONLY || !exists || FORCE);
  const skipPost = !writeMd;

  // 配图优先级：手工指定（桌面「暂定」）> 挑选台保存的选择 > 自动规则
  const man = manual.items?.[main.id];
  const sel = selection?.items?.[main.id];
  const skipImages = man?.skip === true; // 用户说「配图不对，先清空」
  // 候选图先剔掉「也出现在别的条目里」的串图（精选合集与手工配图不受限）
  const cands = candidatesOf(parts).filter((c) => !isForeign(c.thumb, main.id));
  const picks = []; // { src, manual }
  if (man?.files?.length) {
    for (const rel of man.files) {
      const abs = manual.dirs.map((d) => path.join(d, rel)).find((p) => fs.existsSync(p));
      if (abs) picks.push({ src: abs, manual: true });
    }
  }
  // 手工图不按权重裁剪：你在「暂定」里挑了几张就用几张，权重只管正文结构
  if (!skipImages && !picks.length) {
    let chosen = [];
    if (sel?.selected?.length) {
      const valid = new Set(cands.map((c) => c.thumb));
      chosen = sel.selected.filter((t) => valid.has(t));
      if (sel.cover && valid.has(sel.cover)) chosen = [sel.cover, ...chosen.filter((t) => t !== sel.cover)];
    }
    if (!chosen.length) chosen = pickByRule(cands, plan.images);
    if (chosen.length > plan.images) chosen = chosen.slice(0, plan.images);
    for (const t of chosen) picks.push({ src: path.join(SRC, t), manual: false });
  }

  const copied = [];
  if (skipImages) {
    // 清空这篇的配图，并把 frontmatter 的 image 置空（否则会引用不存在的封面导致构建失败）
    if (writeImages && fs.existsSync(postDir)) {
      for (const f of fs.readdirSync(postDir)) if (/\.(jpg|png|jpeg|webp)$/i.test(f)) fs.rmSync(path.join(postDir, f), { force: true });
      if (fs.existsSync(mdPath)) {
        const t = fs.readFileSync(mdPath, 'utf8');
        const t2 = t.replace(/^image: .*$/m, 'image: ""');
        if (t2 !== t) fs.writeFileSync(mdPath, t2, 'utf8');
        syncPreviewSection(mdPath, title, []);
      }
    }
    if (!DRY) fs.rmSync(path.join(PUBLIC_WORKS, `${main.id}.jpg`), { force: true });
  } else {
    if (writeImages) {
      fs.mkdirSync(postDir, { recursive: true });
      for (const f of fs.readdirSync(postDir)) if (/\.(jpg|png|jpeg|webp)$/i.test(f)) fs.rmSync(path.join(postDir, f), { force: true });
    }
    for (let i = 0; i < picks.length; i++) {
      const p = picks[i];
      if (!fs.existsSync(p.src)) continue;
      const name = i === 0 ? 'cover.jpg' : `${String(i).padStart(2, '0')}.jpg`;
      copied.push(name);
      if (!writeImages) continue;
      const out = path.join(postDir, name);
      if (p.manual) {
        // 暂定里的原图很大（最大 28 MB），压到最长边 1600 再入库
        await sharp(p.src).resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85, progressive: true }).toFile(out);
      } else {
        fs.copyFileSync(p.src, out);
      }
    }
  }

  // 作品集网格封面
  const publicCover = (!skipImages && picks.length) ? `/works/${main.id}.jpg` : '';
  if (publicCover && !DRY) {
    if (fs.existsSync(picks[0].src)) {
      await sharp(picks[0].src).resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82, progressive: true }).toFile(path.join(PUBLIC_WORKS, `${main.id}.jpg`));
    }
  }

  // 汇总元数据
  const tools = [...new Set(parts.flatMap((p) => p.tools ?? []))];
  const tags = [...new Set(parts.flatMap((p) => p.tags ?? []))];
  const files = parts.flatMap((p) => p.files ?? []);
  const fileCount = parts.reduce((s, p) => s + (p.counts?.files ?? 0), 0);
  const sizeMB = mb(parts.reduce((s, p) => s + (p.counts?.bytes ?? 0), 0));
  const cImages = parts.reduce((s, p) => s + (p.counts?.images ?? 0), 0);
  const cVideos = parts.reduce((s, p) => s + (p.counts?.videos ?? 0), 0);
  const comp = composition(files);
  const desc = (main.desc ?? '').trim();

  const body = [];
  body.push(`> **分类**：${category} ｜ **编号**：${main.id} ｜ **完成时间**：${doneDate}`);
  if (group) body.push('>');
  if (group) body.push(`> **本项目含 ${parts.length} 部分**：${(group.parts ?? []).map((p) => p.name).join(' / ')}`);
  if (tools.length) { body.push('>'); body.push(`> **使用工具**：${tools.join(' / ')}`); }
  if (tags.length) { body.push('>'); body.push(`> **标签**：${tags.join(' · ')}`); }
  body.push('');
  body.push('## 说明');
  body.push('');
  body.push(desc || '（暂无说明）');
  body.push('');

  // 合并条目：每个部分写一小节
  if (group && parts.length > 1) {
    body.push('## 各部分');
    body.push('');
    for (const p of parts) {
      const nm = (group.parts ?? []).find((x) => x.id === p.id)?.name ?? p.title;
      body.push(`### ${nm}`);
      body.push('');
      body.push((p.desc ?? '').trim() || '（暂无说明）');
      body.push('');
    }
  }

  if (plan.previews && copied.length > 1) {
    body.push('## 预览');
    body.push('');
    for (const n of copied.slice(1)) body.push(`![${title}](./${n})`);
    body.push('');
  }

  if (plan.table) {
    body.push('## 素材');
    body.push('');
    body.push('| 项目 | 数量 |');
    body.push('| --- | --- |');
    body.push(`| 源文件 | ${fileCount} 个 / ${sizeMB} MB |`);
    if (plan.composition && comp) body.push(`| 构成 | ${comp} |`);
    body.push('');
    if (plan.span) body.push(`制作时间跨度：${span}`);
  } else {
    body.push(`*源文件 ${fileCount} 个 / ${sizeMB} MB · 制作于 ${doneDate}*`);
  }

  if (plan.process) {
    body.push('');
    body.push('## 过程与复盘');
    body.push('');
    body.push('<!-- 待补：这一段等程口述制作过程（怎么起手、改了几版、卡在哪、最后怎么定稿）后再写 -->');
  }

  const md = `---
title: ${title}
pubDate: ${doneDate}
description: ${main.subtitle || desc.slice(0, 60)}
category: ${category}
image: ${copied.length ? '"./cover.jpg"' : '""'}
draft: false
slugId: works/${main.id}
pinTop: 0
---

${body.join('\n')}
`;
  if (writeMd) fs.writeFileSync(mdPath, md, 'utf8');
  // 配图变了就同步一次「## 预览」小节（正文不动）
  if (writeImages && !writeMd) syncPreviewSection(mdPath, title, copied.slice(1));

  const item = {
    id: main.id,
    slug: `works/${main.id}`,
    title,
    subtitle: main.subtitle ?? '',
    year: main.year ?? '',
    doneDate,
    span,
    tools,
    tags,
    cover: publicCover,
    weight,
    files: fileCount,
    sizeMB: Number(sizeMB),
    images: cImages,
    videos: cVideos,
    client: group?.client || '',
    parts: group ? (group.parts ?? []).map((p) => p.name) : [],
    imgSource: man?.files?.length ? '暂定手工' : (sel?.selected?.length ? '挑选台' : '自动'),
  };
  if (!byCategory.has(category)) byCategory.set(category, []);
  byCategory.get(category).push(item);
  report.push({ id: main.id, weight, doneDate, copied: copied.length, cat: category, title, skipped: skipPost, parts: parts.length, imgSource: item.imgSource });
}

const order = ['平面设计', '三维建模', '产品渲染', '场景动画'];
const categories = [...byCategory.keys()].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  .map((k) => ({ name: k, count: byCategory.get(k).length, works: byCategory.get(k).sort((a, b) => b.doneDate.localeCompare(a.doneDate)) }));

if (!DRY) {
  fs.writeFileSync(DATA_OUT, JSON.stringify({
    generated: new Date().toISOString().slice(0, 19).replace('T', ' '),
    source: SRC,
    total: report.length,
    relatedClients: merges.relatedClients ?? [],
    categories,
  }, null, 2), 'utf8');
}

report.sort((a, b) => a.id.localeCompare(b.id));
const skipped = report.filter((r) => r.skipped).length;
console.log(`${DRY ? '[dry] 预览' : '已处理'} ${report.length} 个条目 -> ${path.relative(PROJECT, BLOG)}` +
  (skipped ? `（${skipped} 篇已存在、已跳过；要重建加 --force）` : ''));
for (const r of report) {
  console.log(`  ${r.id}  ${r.weight}分  ${r.doneDate}  ${r.copied}图  ${r.cat.padEnd(5)}  ${r.title}${r.parts > 1 ? `（合并 ${r.parts} 部分）` : ''}  [配图:${r.imgSource}]${r.skipped ? ' [正文跳过]' : ''}`);
}
const dist = [5, 4, 3, 2, 1].map((k) => `${k}分 ${report.filter((r) => r.weight === k).length}`).join(' · ');
console.log(`\n分布：${dist}  合计 ${report.length} 条`);
console.log(`作品集数据 -> ${path.relative(PROJECT, DATA_OUT)}（${categories.map((c) => `${c.name} ${c.count}`).join(' / ')}）`);
console.log(`作品集封面 -> ${path.relative(PROJECT, PUBLIC_WORKS)}（${fs.readdirSync(PUBLIC_WORKS).length} 个文件）`);
