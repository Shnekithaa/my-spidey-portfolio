import { useEffect, useRef, useCallback } from 'react';
import './SpiderWorld.css';

const lerp  = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const d2    = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}
function supportsFinePointer() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}
function bodyCol() { return isDark() ? '#b8f090' : '#5a0000'; }
function legCol()  { return isDark() ? '#88cc60' : '#7a0000'; }
function webCol(a) { return isDark() ? `rgba(190,255,150,${a})` : `rgba(110,4,4,${a})`; }

/* ── Returns true if the cursor is hovering interactive content ── */
function isCursorOverContent(mx, my) {
  const el = document.elementFromPoint(mx, my);
  if (!el) return false;
  // Only suppress weaving over specific interactive/readable elements
  // Do NOT include 'section' — it matches the entire page
  return !!(el.closest(
    '.web-card, .proj__card, .terminal, .contact__panel, ' +
    '.skills__tag, .exp__card, nav, footer, ' +
    'a, button, input, textarea'
  ));
}

/* ─────────────────────────────────────────────────────────────────
   drawSpider — proper sideways-fanning legs
───────────────────────────────────────────────────────────────── */
function drawSpider(ctx, x, y, angle, scale = 1, alpha = 1, legPhase = 0) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);

  const s  = scale;
  const bc = bodyCol();
  const lc = legCol();

  // ── Legs drawn BEHIND body ──
  ctx.lineCap = 'round';

  const attachYs      = [-5.5, -2.5, 0.5, 3.0];
  const lateralLeansY = [-0.55, -0.18, 0.15, 0.45];
  const femurL  = 8.5 * s;
  const tibiaL  = 7.5 * s;
  const tarsusL = 5.0 * s;

  [-1, 1].forEach(side => {
    attachYs.forEach((ay, legIdx) => {
      const ax  = side * 3.8 * s;
      const ayS = ay * s;
      const gaitPhase = legIdx % 2 === 0 ? 0 : Math.PI;
      const wave = Math.sin(legPhase * 1.5 + gaitPhase) * 0.18;
      const femurAngle = (side < 0 ? -Math.PI / 2 : Math.PI / 2)
        + lateralLeansY[legIdx] + wave * side;

      const fx = ax + Math.cos(femurAngle) * femurL;
      const fy = ayS + Math.sin(femurAngle) * femurL;

      const kneeBend  = side < 0 ? -0.55 : 0.55;
      const tibiaAngle = femurAngle + kneeBend + wave * 0.3 * side;
      const tx = fx + Math.cos(tibiaAngle) * tibiaL;
      const ty = fy + Math.sin(tibiaAngle) * tibiaL;

      const footBend  = side < 0 ? -0.35 : 0.35;
      const footAngle = tibiaAngle + footBend;
      const tarx = tx + Math.cos(footAngle) * tarsusL;
      const tary = ty + Math.sin(footAngle) * tarsusL;

      ctx.strokeStyle = lc;
      ctx.lineWidth   = 1.3 * s;
      ctx.beginPath(); ctx.moveTo(ax, ayS); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.lineWidth   = 1.0 * s;
      ctx.beginPath(); ctx.moveTo(fx, fy);  ctx.lineTo(tx, ty); ctx.stroke();
      ctx.lineWidth   = 0.65 * s;
      ctx.beginPath(); ctx.moveTo(tx, ty);  ctx.lineTo(tarx, tary); ctx.stroke();

      ctx.beginPath();
      ctx.arc(fx, fy, 1.0 * s, 0, Math.PI * 2);
      ctx.fillStyle = lc; ctx.fill();
    });
  });

  // Abdomen
  ctx.beginPath();
  ctx.ellipse(0, 6.5 * s, 5.2 * s, 7.0 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = bc; ctx.fill();
  ctx.fillStyle = isDark() ? 'rgba(0,30,0,0.45)' : 'rgba(200,100,100,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 5.0*s, 2.0*s, 2.5*s, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 8.0*s, 1.6*s, 2.0*s, 0, 0, Math.PI*2); ctx.fill();

  // Pedicel
  ctx.beginPath();
  ctx.ellipse(0, -0.2 * s, 2.0 * s, 1.4 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = isDark() ? '#70aa50' : '#3a0000'; ctx.fill();

  // Cephalothorax
  ctx.beginPath();
  ctx.ellipse(0, -4.0 * s, 4.2 * s, 5.5 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = bc; ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -4.0 * s, 1.3 * s, 4.0 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = isDark() ? 'rgba(0,0,0,0.3)' : 'rgba(60,0,0,0.3)'; ctx.fill();

  // Head
  ctx.beginPath();
  ctx.ellipse(0, -9.2 * s, 3.2 * s, 3.5 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = bc; ctx.fill();

  // Eyes
  [
    { x: -1.0, y: -10.4, r: 1.05 }, { x: 1.0, y: -10.4, r: 1.05 },
    { x: -2.6, y: -9.8,  r: 0.70 }, { x: 2.6, y: -9.8,  r: 0.70 },
    { x: -1.1, y: -8.6,  r: 0.60 }, { x: 1.1, y: -8.6,  r: 0.60 },
    { x: -2.5, y: -8.2,  r: 0.55 }, { x: 2.5, y: -8.2,  r: 0.55 },
  ].forEach(({ x: ex, y: ey, r }) => {
    ctx.beginPath(); ctx.arc(ex*s, ey*s, r*s, 0, Math.PI*2);
    ctx.fillStyle = isDark() ? '#e0ffe0' : '#cc0000'; ctx.fill();
    ctx.beginPath(); ctx.arc(ex*s*0.9, ey*s*0.9, r*0.5*s, 0, Math.PI*2);
    ctx.fillStyle = '#000'; ctx.fill();
  });

  // Chelicerae
  ctx.strokeStyle = lc; ctx.lineWidth = 1.1 * s; ctx.lineCap = 'round';
  [-1.5, 1.5].forEach(fx => {
    ctx.beginPath(); ctx.moveTo(fx*s, -11.5*s); ctx.lineTo(fx*1.25*s, -13.5*s); ctx.stroke();
    ctx.beginPath(); ctx.arc(fx*1.25*s, -13.5*s, 1.1*s, 0, Math.PI*2);
    ctx.fillStyle = lc; ctx.fill();
  });

  // Pedipalps
  ctx.lineWidth = 0.8 * s;
  [-2.8, 2.8].forEach((px, si) => {
    const palp = Math.sin(legPhase * 0.7 + si * Math.PI) * 0.25;
    ctx.strokeStyle = lc;
    ctx.beginPath();
    ctx.moveTo(px*s, -9.0*s);
    ctx.quadraticCurveTo((px*1.5+palp)*s, -11.0*s, (px*1.9+palp*1.5)*s, -12.8*s);
    ctx.stroke();
    ctx.beginPath(); ctx.arc((px*1.9+palp*1.5)*s, -12.8*s, 0.9*s, 0, Math.PI*2);
    ctx.fillStyle = lc; ctx.fill();
  });

  // Spinnerets
  ctx.beginPath();
  ctx.ellipse(0, 13.5*s, 2.0*s, 1.3*s, 0, 0, Math.PI*2);
  ctx.fillStyle = isDark() ? '#60aa40' : '#3a0000'; ctx.fill();
  [-0.8, 0.8].forEach(sx => {
    ctx.beginPath(); ctx.ellipse(sx*s, 14.2*s, 0.7*s, 0.5*s, 0, 0, Math.PI*2);
    ctx.fillStyle = isDark() ? '#408030' : '#280000'; ctx.fill();
  });

  ctx.restore();
}

/* ── GrowingWeb ─────────────────────────────────── */
function createGrowingWeb(cx, cy, large = false) {
  const threadCount = large ? 14 : 10;
  const maxRings    = large ? 11 : 7;
  const maxRadius   = large
    ? Math.min(window.innerWidth, window.innerHeight) * 0.30
    : 45 + Math.random() * 25;
  const angles = Array.from({ length: threadCount }, (_, i) =>
    (i / threadCount) * Math.PI * 2 + ((i * 13) % 7 - 3) * 0.04
  );
  return {
    cx, cy, angles, threadCount, maxRings, maxRadius,
    phase: 'threads', threadProgress: 0, ringProgress: 0,
    alpha: 0, fadeOut: false, large,
  };
}

function drawGrowingWeb(ctx, web) {
  if (web.alpha <= 0) return;
  const { cx, cy, angles, threadCount, maxRings, maxRadius,
          threadProgress, ringProgress } = web;
  ctx.save();
  ctx.globalAlpha = web.alpha;
  ctx.lineCap = 'round';

  const fullT = Math.floor(threadProgress);
  const fracT = threadProgress - fullT;
  for (let i = 0; i < Math.min(fullT, threadCount); i++) {
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angles[i]) * maxRadius,
               cy + Math.sin(angles[i]) * maxRadius);
    ctx.strokeStyle = webCol(0.65);
    ctx.lineWidth   = i % 3 === 0 ? 0.9 : 0.55; ctx.stroke();
  }
  if (fullT < threadCount && fracT > 0) {
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angles[fullT]) * maxRadius * fracT,
               cy + Math.sin(angles[fullT]) * maxRadius * fracT);
    ctx.strokeStyle = webCol(0.5); ctx.lineWidth = 0.55; ctx.stroke();
  }

  const spacing = maxRadius / (maxRings + 1);
  const fullR   = Math.floor(ringProgress);
  const fracR   = ringProgress - fullR;
  for (let ri = 0; ri <= Math.min(fullR, maxRings - 1); ri++) {
    drawWebRing(ctx, cx, cy, angles, spacing * (ri + 1), 1.0, ri);
  }
  if (fullR < maxRings && fracR > 0 && web.phase === 'rings') {
    drawWebRing(ctx, cx, cy, angles, spacing * (fullR + 1), fracR, fullR);
  }

  ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = webCol(0.85); ctx.fill();
  ctx.restore();
}

function drawWebRing(ctx, cx, cy, angles, r, frac, ri) {
  const n     = angles.length;
  const drawn = Math.floor(n * frac);
  const pFrac = (n * frac) - drawn;
  for (let i = 0; i < Math.min(drawn, n - 1); i++) {
    webArc(ctx, cx, cy, angles[i], angles[i + 1], r, ri);
  }
  if (drawn >= n) webArc(ctx, cx, cy, angles[n - 1], angles[0], r, ri);
  else if (pFrac > 0 && drawn < n - 1) {
    webArc(ctx, cx, cy, angles[drawn], angles[drawn] + (angles[drawn + 1] - angles[drawn]) * pFrac, r, ri);
  }
}

function webArc(ctx, cx, cy, a1, a2, r, ri) {
  const rv  = r * (1 + ((ri * 3 + Math.round(a1 * 8)) % 5 - 2) * 0.012);
  const x1  = cx + rv * Math.cos(a1), y1 = cy + rv * Math.sin(a1);
  const x2  = cx + rv * Math.cos(a2), y2 = cy + rv * Math.sin(a2);
  const mid = (a1 + a2) / 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(
    cx + rv * 0.93 * Math.cos(mid), cy + rv * 0.93 * Math.sin(mid) + rv * 0.035,
    x2, y2
  );
  ctx.strokeStyle = webCol(0.6); ctx.lineWidth = 0.5 + ri * 0.035; ctx.stroke();
}

/* ─────────────────────────────────────────────────────────────────
   SpiderWorld component
───────────────────────────────────────────────────────────────── */
export default function SpiderWorld({ enabled = true }) {
  const canvasRef    = useRef(null);
  const rafId        = useRef(null);
  const isDesktop    = useRef(supportsFinePointer());
  const mouse        = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const lastMouse    = useRef({ x: -999, y: -999 });
  const globalIdle   = useRef(0);
  const lastActivity = useRef(Date.now()); // tracks any activity including scroll

  /* ── Companion ── */
  const comp = useRef({
    x: 200, y: 300, vx: 0, vy: 0,
    angle: 0, legPhase: 0,
    state: 'follow',
    scatterVx: 0, scatterVy: 0, scatterTimer: 0,
    silk: [], idleFrames: 0,
  });
  const compWeb = useRef(null);

  /* ── Crawlers — start in idle-web state ── */
  const crawlers = useRef([
    makeCrawler(0, isDesktop.current),
    makeCrawler(1, isDesktop.current),
    ...(isDesktop.current ? [] : [makeCrawler(2, isDesktop.current)]),
  ]);

  function makeCrawler(id, desktopMode = true) {
    const W = window.innerWidth, H = window.innerHeight;
    const edgeMap = desktopMode ? [0, 2] : [0, 1, 3];
    const edge = edgeMap[id % edgeMap.length];
    let x, y;
    if (edge === 0)      { x = 80 + Math.random() * (W - 160); y = 16; }
    else if (edge === 1) { x = W - 16; y = 80 + Math.random() * (H - 160); }
    else if (edge === 2) { x = 80 + Math.random() * (W - 160); y = H - 16; }
    else                  { x = 16; y = 80 + Math.random() * (H - 160); }
    return {
      x, y, angle: 0, edge,
      speed: 0.5 + Math.random() * 0.3,
      legPhase: Math.random() * Math.PI * 2,
      state: 'idle-web',
      stepsToNext: 0,
      nextCrawlIn: 200 + Math.random() * 200,
      silk: [], web: null,
      scatterVx: 0, scatterVy: 0, scatterTimer: 0,
      restX: x, restY: y,
      hangAngle: Math.random() * Math.PI * 2, // angle spider sits at in finished web
    };
  }

  const resetCrawlers = useCallback((desktopMode) => {
    crawlers.current = [
      makeCrawler(0, desktopMode),
      makeCrawler(1, desktopMode),
      ...(desktopMode ? [] : [makeCrawler(2, desktopMode)]),
    ];
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const onChange = () => {
      const nextDesktopMode = media.matches;
      if (nextDesktopMode === isDesktop.current) return;
      isDesktop.current = nextDesktopMode;
      comp.current = {
        x: 200, y: 300, vx: 0, vy: 0,
        angle: 0, legPhase: 0,
        state: 'follow',
        scatterVx: 0, scatterVy: 0, scatterTimer: 0,
        silk: [], idleFrames: 0,
      };
      compWeb.current = null;
      resetCrawlers(nextDesktopMode);
      lastActivity.current = Date.now();
      lastMouse.current = { x: -999, y: -999 };
    };

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [resetCrawlers]);

  useEffect(() => {
    const resize = () => {
      if (!canvasRef.current) return;
      canvasRef.current.width  = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    if (!isDesktop.current) return;
    const onMove = (e) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      lastActivity.current = Date.now();
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Pointer/tap — scatter companion (desktop) + nearby crawlers
  useEffect(() => {
    const onPointerDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      lastActivity.current = Date.now();
      const px = e.clientX;
      const py = e.clientY;

      const c = comp.current;
      if (isDesktop.current) {
        const away = Math.atan2(c.y - py, c.x - px);
        c.scatterVx = Math.cos(away) * 14;
        c.scatterVy = Math.sin(away) * 14;
        c.scatterTimer = 45;
        c.state = 'scatter';
        c.silk  = [];
        c.idleFrames = 0;
        if (compWeb.current) compWeb.current.fadeOut = true;
      }

      // Disturb crawlers within 220px
      crawlers.current.forEach(cr => {
        if (d2({ x: cr.x, y: cr.y }, { x: px, y: py }) < 220) {
          const a = Math.random() * Math.PI * 2;
          cr.scatterVx = Math.cos(a) * 9;
          cr.scatterVy = Math.sin(a) * 9;
          cr.scatterTimer = 50;
          cr.state = 'scatter';
          cr.silk  = [];
          if (cr.web) cr.web.fadeOut = true;
        }
      });
    };
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, []);

  // Scroll — counts as activity, scatter crawlers
  useEffect(() => {
    const onScroll = () => {
      // Scroll = user is active, reset idle
      lastActivity.current = Date.now();
      globalIdle.current = 0;

      crawlers.current.forEach(cr => {
        if (cr.state !== 'scatter') {
          const a = Math.random() * Math.PI * 2;
          cr.scatterVx = Math.cos(a) * 6;
          cr.scatterVy = Math.sin(a) * 6;
          cr.scatterTimer = 30;
          cr.state = 'scatter';
          cr.silk  = [];
          if (cr.web) cr.web.fadeOut = true;
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (!enabled) {
      rafId.current = requestAnimationFrame(loop);
      return;
    }

    const mx = mouse.current.x;
    const my = mouse.current.y;
    const c  = comp.current;
    const desktopMode = isDesktop.current;

    // True idle = no mouse movement AND no scroll for 6s (360 frames)
    const msMoved = d2(mouse.current, lastMouse.current) > 2;
    if (msMoved) {
      lastMouse.current = { ...mouse.current };
    }
    // Use timestamp-based idle so scroll properly resets it
    const msSinceActivity = Date.now() - lastActivity.current;
    const isGloballyIdle  = msSinceActivity > 6000; // 6 seconds

    // Per-companion idle — increment every frame mouse is still
    // Use timestamp comparison for reliability
    if (msMoved) {
      c.idleFrames = 0;
    } else {
      c.idleFrames++;  // ~60fps, so 360 = 6s
    }

    // Should companion weave? Only if:
    // 1. Companion has been idle 6s (360 frames at 60fps)
    // 2. Cursor is NOT hovering over card/section content
    const cursorOverContent  = desktopMode ? isCursorOverContent(mx, my) : false;
    const companionShouldWeave = desktopMode && c.idleFrames >= 360 && !cursorOverContent;
    const recentActivity = msSinceActivity < 350;

    // Cancel web if cursor moved onto content
    if (desktopMode && compWeb.current && !compWeb.current.fadeOut && cursorOverContent) {
      compWeb.current.fadeOut = true;
    }

    /* ── UPDATE COMPANION ── */
    if (desktopMode) {
      if (c.state === 'scatter') {
        c.x += c.scatterVx; c.y += c.scatterVy;
        c.scatterVx *= 0.86; c.scatterVy *= 0.86;
        c.scatterTimer--;
        c.angle = Math.atan2(c.scatterVy, c.scatterVx);
        c.x = clamp(c.x, 12, W - 12);
        c.y = clamp(c.y, 12, H - 12);
        if (c.scatterTimer <= 0) c.state = 'follow';
      } else {
        const DIST = 90;
        const dd   = d2({ x: c.x, y: c.y }, { x: mx, y: my });
        if (dd > DIST + 4) {
          const ang = Math.atan2(my - c.y, mx - c.x);
          const spd = clamp((dd - DIST) * 0.065, 0.2, 4.5);
          c.vx = lerp(c.vx, Math.cos(ang) * spd, 0.14);
          c.vy = lerp(c.vy, Math.sin(ang) * spd, 0.14);
          c.angle = Math.atan2(c.vy, c.vx);
          c.silk.push({ x: c.x, y: c.y });
          if (c.silk.length > 22) c.silk.shift();
        } else {
          c.vx *= 0.75; c.vy *= 0.75;
        }
        c.x = clamp(c.x + c.vx, 12, W - 12);
        c.y = clamp(c.y + c.vy, 12, H - 12);

        // Start web only when idle 6s AND not over content
        if (companionShouldWeave && !compWeb.current) {
          compWeb.current = createGrowingWeb(c.x, c.y, true);
        }
        // Cancel if mouse moved
        if (msMoved && compWeb.current && !compWeb.current.fadeOut) {
          compWeb.current.fadeOut = true;
          c.idleFrames = 0;
        }
      }
      c.legPhase += 0.10;
    }

    /* ── UPDATE COMPANION WEB ── */
    if (desktopMode && compWeb.current) {
      const w = compWeb.current;
      if (!w.fadeOut) {
        w.alpha = Math.min(w.alpha + 0.022, 1.0);
        if (w.phase === 'threads') {
          w.threadProgress = Math.min(w.threadProgress + 0.16, w.threadCount);
          if (w.threadProgress >= w.threadCount) w.phase = 'rings';
        } else if (w.phase === 'rings') {
          w.ringProgress = Math.min(w.ringProgress + 0.07, w.maxRings);
          if (w.ringProgress >= w.maxRings) w.phase = 'done';
        }
      } else {
        w.alpha -= 0.028;
        if (w.alpha <= 0) compWeb.current = null;
      }
    }

    /* ── UPDATE CRAWLERS ── */
    const edgeM = 16;
    crawlers.current.forEach(cr => {
      if (cr.state === 'scatter') {
        cr.x += cr.scatterVx; cr.y += cr.scatterVy;
        cr.scatterVx *= 0.84; cr.scatterVy *= 0.84;
        cr.scatterTimer--;
        cr.x = clamp(cr.x, 8, W - 8);
        cr.y = clamp(cr.y, 8, H - 8);
        cr.angle = Math.atan2(cr.scatterVy, cr.scatterVx);
        cr.legPhase += 0.14;

        if (cr.scatterTimer <= 0) {
          const dists = [cr.y, W - cr.x, H - cr.y, cr.x];
          cr.edge = dists.indexOf(Math.min(...dists));
          if (cr.edge === 0) cr.y = edgeM;
          else if (cr.edge === 1) cr.x = W - edgeM;
          else if (cr.edge === 2) cr.y = H - edgeM;
          else                    cr.x = edgeM;
          cr.restX = cr.x; cr.restY = cr.y;
          cr.state = 'idle-web';
          cr.web   = createGrowingWeb(cr.x, cr.y, false);
          cr.stepsToNext = 0;
        }

      } else if (cr.state === 'crawl') {
        cr.legPhase += 0.13;
        cr.stepsToNext++;
        const sp = cr.speed;
        if (cr.edge === 0)      { cr.x += sp; cr.y = edgeM;     cr.angle = 0; }
        else if (cr.edge === 1) { cr.y += sp; cr.x = W - edgeM; cr.angle = Math.PI / 2; }
        else if (cr.edge === 2) { cr.x -= sp; cr.y = H - edgeM; cr.angle = Math.PI; }
        else                    { cr.y -= sp; cr.x = edgeM;     cr.angle = -Math.PI / 2; }

        if (cr.edge === 0 && cr.x > W - edgeM) cr.edge = 1;
        if (cr.edge === 1 && cr.y > H - edgeM) cr.edge = 2;
        if (cr.edge === 2 && cr.x < edgeM)     cr.edge = 3;
        if (cr.edge === 3 && cr.y < edgeM)     cr.edge = 0;

        cr.silk.push({ x: cr.x, y: cr.y });
        if (cr.silk.length > 30) cr.silk.shift();

        if (cr.stepsToNext >= cr.nextCrawlIn || isGloballyIdle) {
          cr.state = 'idle-web';
          cr.restX = cr.x; cr.restY = cr.y;
          cr.web   = createGrowingWeb(cr.x, cr.y, false);
          cr.stepsToNext = 0;
          cr.nextCrawlIn = 200 + Math.random() * 200;
        }

      } else if (cr.state === 'idle-web') {
        // Slow leg movement while sitting
        cr.legPhase += 0.018;
        cr.x = lerp(cr.x, cr.restX, 0.08);
        cr.y = lerp(cr.y, cr.restY, 0.08);

        // Grow web
        if (cr.web && !cr.web.fadeOut) {
          cr.web.alpha = Math.min(cr.web.alpha + 0.025, 0.82);
          if (cr.web.phase === 'threads') {
            cr.web.threadProgress = Math.min(cr.web.threadProgress + 0.10, cr.web.threadCount);
            if (cr.web.threadProgress >= cr.web.threadCount) cr.web.phase = 'rings';
          } else if (cr.web.phase === 'rings') {
            cr.web.ringProgress = Math.min(cr.web.ringProgress + 0.05, cr.web.maxRings);
            // When web is done, move spider to hang in web hub
            if (cr.web.ringProgress >= cr.web.maxRings) {
              cr.web.phase = 'done';
            }
          }
        }

        // When mouse becomes active, crawl away
        if (!isGloballyIdle && (desktopMode ? msMoved : recentActivity)) {
          if (cr.web) cr.web.fadeOut = true;
          cr.state = 'crawl';
          cr.silk  = [];
          cr.stepsToNext = 0;
        }
      }

      // Fade dying webs
      if (cr.web && cr.web.fadeOut) {
        cr.web.alpha -= 0.02;
        if (cr.web.alpha <= 0) cr.web = null;
      }
    });

    /* ════════════════════════════════════
       DRAW — webs first (behind spiders)
    ════════════════════════════════════ */

    // Companion web
    if (desktopMode && compWeb.current) drawGrowingWeb(ctx, compWeb.current);

    // Crawler webs
    crawlers.current.forEach(cr => {
      if (cr.web) drawGrowingWeb(ctx, cr.web);
    });

    // Companion silk trail
    if (desktopMode && c.silk.length > 2 && c.state === 'follow') {
      ctx.save();
      ctx.strokeStyle = webCol(0.20); ctx.lineWidth = 0.65; ctx.lineCap = 'round';
      ctx.beginPath();
      c.silk.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke(); ctx.restore();
    }

    // Dashed thread companion → cursor
    if (desktopMode && c.state === 'follow' && !cursorOverContent) {
      ctx.save();
      ctx.strokeStyle = webCol(0.16); ctx.lineWidth = 0.6;
      ctx.setLineDash([3, 6]); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(mx, my);
      ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    }

    // Crawler silk trails
    crawlers.current.forEach(cr => {
      if (cr.silk.length > 2) {
        ctx.save();
        ctx.strokeStyle = webCol(0.14); ctx.lineWidth = 0.5; ctx.lineCap = 'round';
        ctx.beginPath();
        cr.silk.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke(); ctx.restore();
      }
    });

    // Draw crawlers
    // If web is done → spider hangs at hub position
    crawlers.current.forEach(cr => {
      let drawX = cr.x, drawY = cr.y, drawAngle = cr.angle;
      let drawAlpha = cr.state === 'scatter' ? 0.45 : 0.80;

      if (cr.web && cr.web.phase === 'done' && cr.state === 'idle-web') {
        // Sit at web hub — gently oscillate
        const osc = Math.sin(Date.now() * 0.001 + cr.hangAngle) * 3;
        drawX = cr.web.cx + Math.cos(cr.hangAngle) * 8 + osc * 0.3;
        drawY = cr.web.cy + Math.sin(cr.hangAngle) * 8 + osc;
        drawAngle = cr.hangAngle + Math.PI / 2;
      }

      drawSpider(ctx, drawX, drawY, drawAngle, 0.75, drawAlpha, cr.legPhase);
    });

    // Companion
    if (desktopMode) {
      const compA = c.state === 'scatter' ? 0.45 : 0.88;
      drawSpider(ctx, c.x, c.y, c.angle, 1.0, compA, c.legPhase);
    }

    rafId.current = requestAnimationFrame(loop);
  }, [enabled]);

  useEffect(() => {
    rafId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId.current);
  }, [loop]);

  return (
    <canvas ref={canvasRef} className="spider-world" aria-hidden="true" />
  );
}