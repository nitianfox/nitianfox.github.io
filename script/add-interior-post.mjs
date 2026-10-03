// 新增文章：住宅室内设计（人机工程课程设计，2024-06）
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'C:\\Users\\19552\\Desktop\\文档\\人机工程ppt\\新建文件夹 (2)';
const DIR = 'D:\\NTFOX\\src\\content\\blog\\interior-design';
fs.mkdirSync(DIR, { recursive: true });

// 图顺序与说明（按展示逻辑：平面 → 模型 → 各空间 → 鸟瞰 → 施工图）
const IMAGES = [
  ['1.jpg', '平面布置图'],
  ['3333.PNG', 'SketchUp 建模'],
  ['2.PNG', '客厅'],
  ['3.jpg', '餐厅与厨房'],
  ['4.jpg', '主卧'],
  ['5.jpg', '卫生间与走廊'],
  ['6.jpg', '鸟瞰轴测'],
  ['8KKWLA_TRMU(}K`W0@`J61Z.jpg', '施工图'],
];

let n = 0;
let bytes = 0;
for (const [file, cap] of IMAGES) {
  n++;
  const from = path.join(SRC, file);
  if (!fs.existsSync(from)) { console.log('  ✗ 缺', file); continue; }
  bytes += fs.statSync(from).size;
  const to = path.join(DIR, String(n).padStart(2, '0') + '.jpg');
  await sharp(from).resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, progressive: true, mozjpeg: true }).toFile(to);
  console.log(`  ${String(n).padStart(2, '0')}.jpg <- ${file}（${cap}）`);
}
const srcMB = (bytes / 1024 / 1024).toFixed(1);

// 封面用客厅渲染
await sharp(path.join(SRC, '2.PNG')).resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: 80, progressive: true, mozjpeg: true }).toFile(path.join(DIR, 'cover.jpg'));

const md = `---
title: 住宅室内设计
pubDate: 2024-06-02
description: 人机工程课程设计：平面布置、SketchUp 建模与各空间室内渲染
category: 建模渲染
image: "./cover.jpg"
draft: false
slugId: blog/interior-design
pinTop: 0
---

> **分类**：建模渲染 ｜ **类型**：课程设计 ｜ **完成时间**：2024-06
>
> **使用工具**：SketchUp · 渲染器 · AutoCAD

## 说明

人机工程课程设计，完成一套住宅的平面布置与室内空间设计：以人体尺度与动线为依据确定家具尺寸与摆放位置，用 SketchUp 建立空间与家具模型，输出客厅、餐厅、厨房、主卧、卫生间的室内渲染图与鸟瞰轴测图，并整理带尺寸标注的施工图。

## 预览

${IMAGES.map(([, cap], i) => `![${cap}](./${String(i + 1).padStart(2, '0')}.jpg)`).join('\n')}

## 素材

*源文件 8 个 / ${srcMB} MB（含 PPT 汇报）· 制作于 2024-06*
`;

fs.writeFileSync(path.join(DIR, 'zh-cn.md'), md, 'utf8');
console.log('  zh-cn.md 已写入（pubDate 2024-06-02，按时间排在时间线里）');
