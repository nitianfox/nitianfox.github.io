// 归纳全站展板：把各作品里的展板图汇总、按内容去重、压成网页尺寸放进 public/boards，
// 并产出 src/data/boards.json 供作品集页显示。
//   node script/portfolio/gen-boards.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, '..', '..');
const SRC = process.env.PORTFOLIO_SRC || 'D:\\工业设计作品集';
const WEB = path.join(SRC, '_网页数据');
const OUT_DIR = path.join(PROJECT, 'public', 'boards');
const DATA_OUT = path.join(PROJECT, 'src', 'data', 'boards.json');

const works = JSON.parse(fs.readFileSync(path.join(WEB, 'works.json'), 'utf8')).works;
const byId = new Map(works.map((w) => [w.id, w]));
const weights = JSON.parse(fs.readFileSync(path.join(HERE, 'weights.json'), 'utf8')).works;

// 哪些条目算「展板」：整条就是展板合集的，加上名字里带展板的图
const BOARD_WORKS = ['03-27', '03-29', '03-30', '03-31'];
const isBoardName = (s) => /展板|海报板|board/i.test(s);
// 明显是素材站下载的参考板，排除
const isDownloaded = (s) => /爱给网|aigei|_1440w|@\d+w|v2-/i.test(s);

const seen = new Set();
const rows = [];
// 「预览_xxx」是整理作品集时按原图生成的预览副本，有原图就不要它
const isGeneratedPreview = (s) => /^预览_/.test(path.basename(s));

// 每块展板归回它真正所属的项目（点进去直达那个作品）
const BOARD_TARGET = {
  '03-27|浴缸.png': '02-12',
  '03-27|连杆吊灯.png': '02-17',
  '03-27|碎纸机.png': '02-14',
  '03-27|香薰.png': '02-15',
  '03-27|螺丝刀.png': '02-11',
  '03-27|头盔.jpg': '03-30',
  '03-27|展板.png': '02-11',
};
// 用户 2026-10-03：展板总览去重 —— 删掉第一块适老化浴缸（02-12 那份底部还印着咖啡杯模板）与第一块头盔板
const SKIP = new Set(['02-12|展板.png', '03-27|头盔.jpg']);

function addItem(workId, name, rel) {
  const w = byId.get(workId);
  if (!w) return;
  if (SKIP.has(`${workId}|${name}`)) return;
  const abs = path.join(SRC, rel);
  if (!fs.existsSync(abs)) return;
  const h = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
  if (seen.has(h)) return; // 同一块展板只留一份
  seen.add(h);
  rows.push({ workId, workTitle: w.title, name, rel, abs, weight: weights[workId] ?? 0 });
}

// 一个作品先加原板，没有原板才用生成的预览图
function pushWork(workId, filter) {
  const w = byId.get(workId);
  if (!w || (weights[workId] ?? 0) <= 0) return;
  const cands = (w.images ?? []).filter((i) => i.thumb && !isDownloaded(i.name) && !isDownloaded(i.rel) && (!filter || filter(i)));
  const originals = cands.filter((i) => !isGeneratedPreview(i.name));
  const previews = cands.filter((i) => isGeneratedPreview(i.name));
  for (const i of originals) addItem(workId, i.name, i.thumb);
  if (!originals.length) for (const i of previews) addItem(workId, i.name, i.thumb);
}

// 1. 整条是展板的条目
for (const id of BOARD_WORKS) pushWork(id, null);
// 2. 其它作品里名字带「展板」的图
for (const w of works) {
  if ((weights[w.id] ?? 0) <= 0) continue;
  if (BOARD_WORKS.includes(w.id)) continue;
  pushWork(w.id, (i) => isBoardName(i.name));
}

// 按作品编号 + 名字排序，输出
rows.sort((a, b) => a.workId.localeCompare(b.workId) || a.name.localeCompare(b.name));

fs.mkdirSync(OUT_DIR, { recursive: true });
// 清掉旧文件
for (const f of fs.readdirSync(OUT_DIR)) if (/\.jpg$/i.test(f)) fs.rmSync(path.join(OUT_DIR, f), { force: true });



const items = [];
let n = 0;
for (const r of rows) {
  n++;
  const file = `${String(n).padStart(2, '0')}.jpg`;
  await sharp(r.abs).resize({ width: 1100, height: 1100, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 84, progressive: true }).toFile(path.join(OUT_DIR, file));
  const targetId = BOARD_TARGET[`${r.workId}|${r.name}`] ?? BOARD_TARGET[r.name] ?? r.workId;
  const target = byId.get(targetId);
  items.push({
    file: `/boards/${file}`,
    name: target ? `${target.title} 展板` : r.name,
    workId: targetId,
    workTitle: target ? target.title : r.workTitle,
    workSlug: `works/${targetId}`,
    from: r.workId === targetId ? '' : r.workId,
  });
}

fs.writeFileSync(DATA_OUT, JSON.stringify({
  generated: new Date().toISOString().slice(0, 19).replace('T', ' '),
  total: items.length,
  note: '全站展板汇总（按图片内容去重；素材站下载的参考板已排除）',
  items,
}, null, 2), 'utf8');

console.log(`展板汇总：${items.length} 块 -> ${path.relative(PROJECT, OUT_DIR)}`);
for (const it of items) console.log(`  ${path.basename(it.file)}  ${it.workId}  ${it.name}`);
console.log(`数据 -> ${path.relative(PROJECT, DATA_OUT)}`);
