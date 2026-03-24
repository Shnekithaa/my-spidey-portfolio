import { useState, useCallback, useRef, useEffect } from 'react';
import { skillCategories, certifications, softSkills } from '../../data/portfolio';
import WebCard from '../shared/WebCard/WebCard';
import SectionHeader from '../shared/SectionHeader/SectionHeader';
import './Skills.css';

const ANCHORS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-left', 'top-right'];

/* ── WebShotCanvas ──────────────────────────────────────────────────── */
function WebShotCanvas({ canvasRef }) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width  = rect.width;
      canvas.height = rect.height;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, [canvasRef]);
  return <canvas ref={canvasRef} className="skills__canvas" aria-hidden="true" />;
}

/* ── drawCornerWeb ──────────────────────────────────────────────────── */
function drawCornerWeb(ctx, rect, corner, alpha, isDark) {
  if (alpha <= 0) return;
  const color = isDark
    ? `rgba(255,255,255,${alpha})`
    : `rgba(140,5,5,${alpha})`;

  const cx = corner.includes('l') ? rect.left            : rect.left + rect.width;
  const cy = corner.includes('t') ? rect.top             : rect.top  + rect.height;

  const maxR    = 60;
  const threads = 8;
  const rings   = 5;

  const startAngle = corner === 'tl' ? 0
    : corner === 'tr' ? Math.PI / 2
    : corner === 'bl' ? -Math.PI / 2
    : Math.PI;
  const sweep = Math.PI / 2;

  const angles = Array.from({ length: threads }, (_, i) => {
    const base   = startAngle + (i / (threads - 1)) * sweep;
    const wobble = ((i * 17 + cx) % 5 - 2) * 0.04;
    return base + wobble;
  });

  // Threads
  angles.forEach((angle, i) => {
    const len = maxR * (0.7 + (i % 3) * 0.1);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
    ctx.strokeStyle = color;
    ctx.lineWidth   = i % 2 === 0 ? 1.0 : 0.7;
    ctx.stroke();
  });

  // Arcs
  for (let ri = 0; ri < rings; ri++) {
    const r = (maxR / (rings + 1)) * (ri + 1);
    for (let i = 0; i < angles.length - 1; i++) {
      const a1  = angles[i], a2 = angles[i + 1];
      const rv  = r * (1 + ((ri * 3 + i * 7) % 5 - 2) * 0.015);
      const x1  = cx + rv * Math.cos(a1), y1 = cy + rv * Math.sin(a1);
      const x2  = cx + rv * Math.cos(a2), y2 = cy + rv * Math.sin(a2);
      const mid = (a1 + a2) / 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(
        cx + rv * 0.92 * Math.cos(mid),
        cy + rv * 0.92 * Math.sin(mid),
        x2, y2
      );
      ctx.strokeStyle = color;
      ctx.lineWidth   = 0.65;
      ctx.stroke();
    }
  }

  // Anchor dot
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/* ── useWebShot ─────────────────────────────────────────────────────── */
const STICKY_PEAK_ALPHA = 0.55;  // max opacity of corner webs at peak
const STICKY_FADE_MS    = 4000;  // how long until fully gone (ms)

function useWebShot(canvasRef, sectionRef) {
  const shots      = useRef([]);
  const stickyWebs = useRef([]);  // { rect, isDark, createdAt }
  const rafId      = useRef(null);

  const redrawSticky = useCallback((ctx) => {
    const now = performance.now();
    // Remove fully faded webs
    stickyWebs.current = stickyWebs.current.filter(w => {
      const age = now - w.createdAt;
      return age < STICKY_FADE_MS;
    });

    stickyWebs.current.forEach(w => {
      const age     = now - w.createdAt;
      // Fade in quickly (0→peak in first 300ms), then fade out over remaining time
      let alpha;
      if (age < 300) {
        alpha = STICKY_PEAK_ALPHA * (age / 300);
      } else {
        const fadeProgress = (age - 300) / (STICKY_FADE_MS - 300);
        alpha = STICKY_PEAK_ALPHA * (1 - fadeProgress);
      }
      if (alpha <= 0) return;
      ['tl', 'tr', 'bl', 'br'].forEach(corner => {
        drawCornerWeb(ctx, w.rect, corner, alpha, w.isDark);
      });
    });
  }, []);

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    redrawSticky(ctx);

    shots.current = shots.current.filter(s => s.t < 1);

    shots.current.forEach(shot => {
      shot.t += 0.038; // slightly slower = more visible
      const t    = Math.min(shot.t, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      // Register sticky web when thwip completes
      if (t >= 1 && !shot.webRegistered) {
        shot.webRegistered = true;
        if (shot.cardRect) {
          stickyWebs.current.push({
            rect:      shot.cardRect,
            isDark:    shot.isDark,
            createdAt: performance.now(),
          });
        }
      }

      // ── Ripple rings — thick, vivid ──────────────
      for (let i = 0; i < 3; i++) {
        const delay  = i * 0.18;
        const rt     = Math.max(0, (t - delay) / (1 - delay));
        if (rt <= 0) continue;
        const radius = rt * (70 + i * 22);
        // High alpha that fades toward end
        const alpha  = (1 - rt) * (shot.isCert ? 0.95 : shot.isDark ? 0.85 : 0.80);
        ctx.beginPath();
        ctx.arc(shot.x, shot.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = shot.isCert
          ? `rgba(255,210,50,${alpha})`
          : shot.isDark
            ? `rgba(255,255,255,${alpha})`
            : `rgba(200,10,10,${alpha})`;
        ctx.lineWidth = Math.max(0.5, (2.5 - i * 0.5) * (1 - rt * 0.6));
        ctx.stroke();
      }

      // ── Web-strand burst — longer, bolder ────────
      const strandCount = 10;
      for (let i = 0; i < strandCount; i++) {
        const angle   = (i / strandCount) * Math.PI * 2 + shot.angleOffset;
        const len     = ease * (40 + (i % 4) * 14);
        const alpha   = (1 - ease) * (shot.isCert ? 0.95 : shot.isDark ? 0.85 : 0.80);
        const sx      = shot.x + Math.cos(angle) * 4;
        const sy      = shot.y + Math.sin(angle) * 4;
        const ex      = shot.x + Math.cos(angle) * len;
        const ey      = shot.y + Math.sin(angle) * len;
        const kx      = shot.x + Math.cos(angle + 0.28) * len * 0.5;
        const ky      = shot.y + Math.sin(angle + 0.28) * len * 0.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(kx, ky, ex, ey);
        ctx.strokeStyle = shot.isCert
          ? `rgba(255,210,50,${alpha})`
          : shot.isDark
            ? `rgba(220,255,180,${alpha})`
            : `rgba(180,8,8,${alpha})`;
        ctx.lineWidth = 1.4;
        ctx.lineCap   = 'round';
        ctx.stroke();
      }

      // ── Center flash — big and punchy ────────────
      if (t < 0.35) {
        const flashAlpha = (1 - t / 0.35) * 0.9;
        const flashR     = t * 22;
        const grad = ctx.createRadialGradient(shot.x, shot.y, 0, shot.x, shot.y, flashR);
        grad.addColorStop(0, shot.isCert
          ? `rgba(255,235,80,${flashAlpha})`
          : shot.isDark
            ? `rgba(200,255,160,${flashAlpha})`
            : `rgba(255,30,30,${flashAlpha})`
        );
        grad.addColorStop(0.5, shot.isCert
          ? `rgba(255,180,30,${flashAlpha * 0.5})`
          : shot.isDark
            ? `rgba(100,200,50,${flashAlpha * 0.4})`
            : `rgba(200,0,0,${flashAlpha * 0.4})`
        );
        grad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(shot.x, shot.y, flashR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // ── Impact ring — sharp hard edge at click ───
      if (t < 0.2) {
        const ir = t * 16;
        const ia = (1 - t / 0.2) * (shot.isCert ? 1.0 : 0.95);
        ctx.beginPath();
        ctx.arc(shot.x, shot.y, ir, 0, Math.PI * 2);
        ctx.strokeStyle = shot.isCert
          ? `rgba(255,255,180,${ia})`
          : shot.isDark
            ? `rgba(255,255,255,${ia})`
            : `rgba(255,80,80,${ia})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // ── Venom goo particles (dark + non-cert) ────
      if (shot.isDark && !shot.isCert) {
        shot.particles.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= 0.025;
          if (p.life <= 0) return;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180,255,120,${p.life * 0.9})`;
          ctx.fill();
        });
        shot.particles = shot.particles.filter(p => p.life > 0);
      }
    });

    // Keep loop alive while sticky webs are still fading
    const hasActiveFade = stickyWebs.current.length > 0;
    if (shots.current.length > 0 || hasActiveFade) {
      rafId.current = requestAnimationFrame(loop);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [canvasRef, redrawSticky]);

  const fire = useCallback((e, tagEl, isCert = false) => {
    const canvas  = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;

    const cRect  = canvas.getBoundingClientRect();
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const x      = e.clientX - cRect.left;
    const y      = e.clientY - cRect.top;

    const cardEl = tagEl.closest('.web-card') || tagEl.closest('.skills__cert-wrap');
    let cardRect = null;
    if (cardEl) {
      const r  = cardEl.getBoundingClientRect();
      cardRect = { left: r.left - cRect.left, top: r.top - cRect.top, width: r.width, height: r.height };
    }

    const particles = isDark && !isCert
      ? Array.from({ length: 14 }, () => {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 3.5;
          return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2.5, r: 2.5 + Math.random() * 3.5, life: 0.9 + Math.random() * 0.1 };
        })
      : [];

    shots.current.push({ x, y, t: 0, isDark, isCert, angleOffset: Math.random() * Math.PI, particles, cardRect, webRegistered: false });
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(loop);
  }, [canvasRef, sectionRef, loop]);

  useEffect(() => () => cancelAnimationFrame(rafId.current), []);
  return fire;
}

/* ── SkillTag ───────────────────────────────────────────────────────── */
function SkillTag({ label, onFire, onThwipChange }) {
  const [active, setActive] = useState(false);
  const timeoutRef = useRef(null);

  const handleClick = useCallback((e) => {
    onFire(e, e.currentTarget, false);
    setActive(true);
    onThwipChange(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => { setActive(false); onThwipChange(false); }, 650);
  }, [onFire, onThwipChange]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return (
    <li
      className={`skills__tag font-mono${active ? ' skills__tag--active' : ''}`}
      onClick={handleClick}
      role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick(e)}
      aria-label={`${label} skill`}
      data-hover
    >
      <span className="skills__tag-text">{label}</span>
      <span className="skills__tag-web" aria-hidden="true" />
    </li>
  );
}

/* ── SkillCategory ──────────────────────────────────────────────────── */
function SkillCategory({ icon, title, tags, index, onFire }) {
  const [suppressed, setSuppressed] = useState(false);
  const countRef = useRef(0);

  const handleThwipChange = useCallback((active) => {
    countRef.current += active ? 1 : -1;
    setSuppressed(countRef.current > 0);
  }, []);

  return (
    <WebCard className="skills__cat" webAnchor={ANCHORS[index % ANCHORS.length]} suppressHover={suppressed}>
      <h3 className="skills__cat-title">
        <span className="skills__cat-icon" aria-hidden="true">{icon}</span>
        {title}
      </h3>
      <ul className="skills__tags" role="list">
        {tags.map((tag) => (
          <SkillTag key={tag} label={tag} onFire={onFire} onThwipChange={handleThwipChange} />
        ))}
      </ul>
    </WebCard>
  );
}

/* ── CertBadge ──────────────────────────────────────────────────────── */
function CertBadge({ label, href, onFire }) {
  const [active, setActive] = useState(false);
  const timeoutRef = useRef(null);

  const handleClick = useCallback((e) => {
    onFire(e, e.currentTarget, true);
    setActive(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setActive(false), 600);
  }, [onFire]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return (
    <a
      href={href} target="_blank" rel="noreferrer"
      className={`skills__cert font-mono skills__cert-wrap${active ? ' skills__cert--active' : ''}`}
      onClick={handleClick}
      data-hover
      aria-label={`View certificate: ${label}`}
    >
      <span className="skills__cert-icon" aria-hidden="true">🏅</span>
      {label}
      <span className="skills__cert-arrow" aria-hidden="true">↗</span>
    </a>
  );
}

/* ── Skills section ─────────────────────────────────────────────────── */
export default function Skills() {
  const canvasRef  = useRef(null);
  const sectionRef = useRef(null);
  const fire       = useWebShot(canvasRef, sectionRef);

  return (
    <section id="skills" className="skills section-base" aria-label="Skills" ref={sectionRef}>
      <WebShotCanvas canvasRef={canvasRef} />
      <SectionHeader num="02" label="What I Know" title="SKILLS" />
      <div className="skills__grid">
        {skillCategories.map((cat, i) => (
          <SkillCategory key={cat.title} {...cat} index={i} onFire={fire} />
        ))}
      </div>
      <div className="skills__extras">
        <div className="skills__extras-col">
          <p className="skills__extras-label font-mono">Certifications</p>
          <div className="skills__certs">
            {certifications.map((c) => (
              <CertBadge key={c.label} label={c.label} href={c.href} onFire={fire} />
            ))}
          </div>
        </div>
        <div className="skills__extras-col">
          <p className="skills__extras-label font-mono">Soft Skills</p>
          <div className="skills__soft">
            {softSkills.map((s) => (
              <span key={s} className="skills__soft-tag font-mono">{s}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}