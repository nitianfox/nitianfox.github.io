/**
 * 客户端换页的统一初始化入口。
 */
type PageInit = () => void;

const inits = new Set<PageInit>();
let started = false;

function runAll() {
  for (const fn of inits) {
    try {
      fn();
    } catch (error) {
      console.error('[page-init]', error);
    }
  }
}

/** 注册「首屏 + 每次换页」都要跑的初始化（必须幂等） */
export function registerPageInit(fn: PageInit): void {
  inits.add(fn);
  // 首屏已经跑过（说明本模块是换页之后才第一次被加载的）：立刻补跑
  if (started) fn();
}

/**
 * 手动跑一遍全部初始化。
 * 给「没有换页、但 DOM 变了」的场景用：自动翻页把新卡片插进列表后，
 * 需要让 AOS / 灯箱 / 目录等重新收集元素（等价于一次换页后的那一轮）。
 * 注册的回调都要求幂等，所以重复调用是安全的。
 */
export function runPageInit(): void {
  runAll();
}

function boot() {
  if (started) return;
  started = true;
  runAll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

// swup 的 page:view 会被 @swup/astro 派发成 astro:page-load（首屏不会派发）
document.addEventListener('astro:page-load', runAll);
