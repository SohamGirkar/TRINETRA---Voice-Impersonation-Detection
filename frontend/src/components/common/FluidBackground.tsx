import { useEffect, useRef } from 'react';

/**
 * FluidBackground
 *
 * Four blurred organic blob divs that follow the cursor with layered inertia,
 * creating a viscous dark-ink/slime liquid effect on the page background.
 *
 * Implementation: CSS filter:blur on absolutely-positioned divs driven by
 * requestAnimationFrame + lerp. GPU-accelerated — no React state on mousemove.
 *
 * Respects prefers-reduced-motion.
 */
export function FluidBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Blob config — 4 layers, different lag + size ────────────────────────
    // lag: lerp factor per frame (lower = more drag = more viscous)
    // rx/ry: ellipse half-axes as % of vmin
    // blur: CSS blur radius in px
    const BLOBS = [
      { lag: 0.040, rx: 28, ry: 20, blur: 70,  ox:  0,  oy:  0 },
      { lag: 0.024, rx: 22, ry: 14, blur: 55,  ox: -18, oy:  24 },
      { lag: 0.015, rx: 16, ry: 11, blur: 44,  ox:  30, oy: -18 },
      { lag: 0.010, rx: 10, ry:  7, blur: 36,  ox: -12, oy:  36 },
    ] as const;

    // Interpolated positions per blob
    const pos = BLOBS.map(() => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));
    // Raw mouse (mutated in listener, never triggers setState)
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    let time = 0;

    // ── Build DOM elements ──────────────────────────────────────────────────
    const vmin = () => Math.min(window.innerWidth, window.innerHeight);

    const els = BLOBS.map((cfg) => {
      const el = document.createElement('div');
      const vm = vmin();
      el.style.cssText = [
        'position:absolute',
        'border-radius:50%',
        'pointer-events:none',
        'will-change:transform,background',
        'transform-origin:center center',
        `width:${vm * cfg.rx / 100 * 2}px`,
        `height:${vm * cfg.ry / 100 * 2}px`,
        `margin-left:-${vm * cfg.rx / 100}px`,
        `margin-top:-${vm * cfg.ry / 100}px`,
        `filter:blur(${cfg.blur}px)`,
      ].join(';');
      container.appendChild(el);
      return el;
    });

    // ── Resize ─────────────────────────────────────────────────────────────
    const resize = () => {
      const vm = vmin();
      BLOBS.forEach((cfg, i) => {
        els[i].style.width      = `${vm * cfg.rx / 100 * 2}px`;
        els[i].style.height     = `${vm * cfg.ry / 100 * 2}px`;
        els[i].style.marginLeft = `-${vm * cfg.rx / 100}px`;
        els[i].style.marginTop  = `-${vm * cfg.ry / 100}px`;
      });
    };
    window.addEventListener('resize', resize);

    // ── Mouse (passive, no setState) ────────────────────────────────────────
    const onMouseMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // ── Per-theme alpha values ──────────────────────────────────────────────
    const ALPHAS_DARK  = [0.17, 0.13, 0.10, 0.08];
    const ALPHAS_LIGHT = [0.12, 0.09, 0.068, 0.048];

    // ── Render loop ─────────────────────────────────────────────────────────
    let raf = 0;
    const render = () => {
      if (!reducedMotion) time += 0.006;

      const isLight = document.documentElement.dataset.theme === 'light';
      const alphas  = isLight ? ALPHAS_LIGHT : ALPHAS_DARK;
      const r       = isLight ? 10  : 255;
      const g       = isLight ? 10  : 255;
      const b       = isLight ? 10  : 255;

      BLOBS.forEach((cfg, i) => {
        pos[i].x += (mouse.x + cfg.ox - pos[i].x) * cfg.lag;
        pos[i].y += (mouse.y + cfg.oy - pos[i].y) * cfg.lag;

        const sx = 1 + Math.sin(time * (0.7 + i * 0.2) + i * 1.4) * 0.15;
        const sy = 1 + Math.cos(time * (0.5 + i * 0.3) + i * 2.1) * 0.11;

        els[i].style.left       = `${pos[i].x}px`;
        els[i].style.top        = `${pos[i].y}px`;
        els[i].style.transform  = `scale(${sx},${sy})`;
        els[i].style.background = `rgba(${r},${g},${b},${alphas[i]})`;
      });

      raf = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      els.forEach((el) => el.remove());
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}
    />
  );
}
