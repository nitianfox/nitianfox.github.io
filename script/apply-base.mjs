// 子路径部署支持：构建后把 dist 里所有根路径资源补上站点 base。
// 用法：BASE_PATH=/ntfox 时执行；不带 BASE_PATH（根目录部署，如 Cloudflare Pages）则什么都不做。
// 由 package.json 的 build 脚本在 astro build 之后、pagefind 之前调用。
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const raw = process.env.BASE_PATH || '/';
const base = raw.endsWith('/') ? raw.slice(0, -1) : raw; // '' 或 '/ntfox'

if (!fs.existsSync(DIST)) {
  console.error('[apply-base] 找不到 dist 目录，先跑 astro build');
  process.exit(1);
}

// 写一份构建体检文件（任何模式都写）：部署后访问 /build-info.json 就能知道这次构建拿到了什么环境变量
const info = {
  builtAt: new Date().toISOString(),
  siteUrl: process.env.SITE_URL || '',
  basePath: raw,
  baseApplied: base || '(根目录)',
  repo: process.env.GITHUB_REPOSITORY || '(本地构建)',
  commit: process.env.GITHUB_SHA || '',
  runId: process.env.GITHUB_RUN_ID || '',
};
fs.writeFileSync(path.join(DIST, 'build-info.json'), JSON.stringify(info, null, 2), 'utf8');
console.log('[apply-base] 构建信息 -> /build-info.json', JSON.stringify(info));

if (!base) {
  console.log('[apply-base] 根目录部署，无需处理');
  process.exit(0);
}
console.log(`[apply-base] 为子路径部署补 base: ${base}`);

const skip = (url) =>
  !url.startsWith('/') ||
  url.startsWith('//') ||
  url.startsWith('/#') ||
  url.startsWith('/_astro/') ||
  url === base ||
  url.startsWith(`${base}/`);

const rewriteHtml = (html) =>
  html.replace(/(\s(?:src|href|poster|data-pagefind-script)=)(["'])(\/[^"']*)\2/g, (m, attr, q, url) =>
    skip(url) ? m : `${attr}${q}${base}${url}${q}`,
  );

const rewriteCss = (css) =>
  css.replace(/url\((['"]?)(\/(?!_astro\/)[^'")]+)\1\)/g, (m, q, url) => (skip(url) ? m : `url(${q}${base}${url}${q})`));

let nHtml = 0;
let nCss = 0;
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (/\.html$/i.test(e.name)) {
      const t = fs.readFileSync(p, 'utf8');
      const o = rewriteHtml(t);
      if (o !== t) { fs.writeFileSync(p, o, 'utf8'); nHtml++; }
    } else if (/\.css$/i.test(e.name)) {
      const t = fs.readFileSync(p, 'utf8');
      const o = rewriteCss(t);
      if (o !== t) { fs.writeFileSync(p, o, 'utf8'); nCss++; }
    }
  }
};

if (!fs.existsSync(DIST)) {
  console.error('[apply-base] 找不到 dist 目录，先跑 astro build');
  process.exit(1);
}
walk(DIST);


console.log(`[apply-base] 改写了 ${nHtml} 个 HTML、${nCss} 个 CSS`);
