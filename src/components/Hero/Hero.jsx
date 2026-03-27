import { useEffect, useRef, useState } from 'react';
import { personal } from '../../data/portfolio';
import './Hero.css';

/* ── Ambient background web (desktop) ───────── */
function AmbientWeb() {
  const color = 'var(--web-stroke)';
  const threads = 14, rings = 7;
  const cx = 1050, cy = 80, maxR = 520;
  const angleStep = (Math.PI * 0.6) / (threads - 1);
  const startRad  = Math.PI * 1.08;
  const lines = Array.from({ length: threads }, (_, i) => {
    const a      = startRad + i * angleStep;
    const wobble = ((i * 31) % 9 - 4) * 0.4;
    return { angle: a + (wobble * Math.PI) / 180 };
  });
  return (
    <svg className="hero__ambient-web" viewBox="0 0 1200 900"
      xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {lines.map(({ angle }, i) => (
        <line key={i} x1={cx} y1={cy}
          x2={cx + maxR * Math.cos(angle)} y2={cy + maxR * Math.sin(angle)}
          stroke={color} strokeWidth="0.9" />
      ))}
      {Array.from({ length: rings }, (_, ri) => {
        const r = (maxR / (rings + 1)) * (ri + 1);
        return lines.slice(0, -1).map(({ angle: a1 }, i) => {
          const a2  = lines[i + 1].angle;
          const rv  = r * (1 + (((ri * 5 + i * 11) % 7) - 3) * 0.012);
          const x1  = cx + rv * Math.cos(a1), y1 = cy + rv * Math.sin(a1);
          const x2  = cx + rv * Math.cos(a2), y2 = cy + rv * Math.sin(a2);
          const mid = (a1 + a2) / 2;
          return (
            <path key={`${ri}-${i}`}
              d={`M ${x1} ${y1} Q ${cx + rv * 0.93 * Math.cos(mid)} ${cy + rv * 0.93 * Math.sin(mid)} ${x2} ${y2}`}
              fill="none" stroke={color} strokeWidth="0.65" />
          );
        });
      })}
      <circle cx={cx} cy={cy} r={3} fill={color} />
    </svg>
  );
}

/* ── Spider-Sense zig-zag ────────────────────── */
function SpiderSense({ active }) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * 360;
    const len1  = 18 + (i % 3) * 8, len2 = len1 + 12;
    const rad1  = (angle * Math.PI) / 180;
    const rad2  = ((angle + 15) * Math.PI) / 180;
    return {
      x1: 50 + Math.cos(rad1) * 48, y1: 50 + Math.sin(rad1) * 48,
      x2: 50 + Math.cos(rad1) * (48 + len1), y2: 50 + Math.sin(rad1) * (48 + len1),
      x3: 50 + Math.cos(rad2) * (48 + len2), y3: 50 + Math.sin(rad2) * (48 + len2),
    };
  });
  return (
    <svg className={`hero__sense${active ? ' hero__sense--active' : ''}`}
      viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {rays.map((r, i) => (
        <polyline key={i}
          points={`${r.x1},${r.y1} ${r.x2},${r.y2} ${r.x3},${r.y3}`}
          fill="none" stroke="var(--accent)" strokeWidth="0.9"
          strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

/* ── Mobile web scene SVG ────────────────────── */
function MobileWebScene() {
  const color   = 'var(--accent)';
  const W = 390, H = 320;
  // Centre-top origin — web hangs down from where the spider is
  const cx = W / 2, cy = 0;
  const threads = 13, rings = 6, maxR = 260;
  const angleStep = Math.PI / (threads - 1);

  const lines = Array.from({ length: threads }, (_, i) => ({
    angle: i * angleStep,
  }));

  // Radial concentric arcs
  const arcs = Array.from({ length: rings }, (_, ri) => {
    const r = (maxR / (rings + 1)) * (ri + 1);
    return lines.slice(0, -1).map(({ angle: a1 }, i) => {
      const a2  = lines[i + 1].angle;
      const rv  = r * (1 + (((ri * 5 + i * 9) % 7) - 3) * 0.014);
      const x1  = cx + rv * Math.cos(a1), y1 = cy + rv * Math.sin(a1);
      const x2  = cx + rv * Math.cos(a2), y2 = cy + rv * Math.sin(a2);
      const mid = (a1 + a2) / 2;
      return (
        <path key={`${ri}-${i}`}
          d={`M ${x1} ${y1} Q ${cx + rv * 0.91 * Math.cos(mid)} ${cy + rv * 0.91 * Math.sin(mid)} ${x2} ${y2}`}
          fill="none" stroke={color} strokeWidth="0.55"
          strokeOpacity={0.28 + ri * 0.06} />
      );
    });
  });

  return (
    <svg className="hero__web-scene" viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMin meet"
      aria-hidden="true">
      {/* Radial threads */}
      {lines.map(({ angle }, i) => (
        <line key={i}
          x1={cx} y1={cy}
          x2={cx + maxR * Math.cos(angle)} y2={cy + maxR * Math.sin(angle)}
          stroke={color} strokeWidth="0.6" strokeOpacity="0.22" />
      ))}
      {/* Concentric arcs */}
      {arcs}
      {/* Origin dot */}
      <circle cx={cx} cy={cy} r={2} fill={color} fillOpacity="0.5" />
    </svg>
  );
}

/* ── Hero ────────────────────────────────────── */
export default function Hero() {
  const [senseActive, setSenseActive] = useState(false);
  const idleTimer = useRef(null);
  const skillsTicker = 'MERN Stack · AI Integration · Microservices · Clean Architecture';

  useEffect(() => {
    const reset = () => {
      setSenseActive(false);
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setSenseActive(true), 5000);
    };
    window.addEventListener('mousemove', reset, { passive: true });
    window.addEventListener('keydown',   reset, { passive: true });
    reset();
    return () => {
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('keydown',   reset);
      clearTimeout(idleTimer.current);
    };
  }, []);

  return (
    <section id="hero" className="hero section-base" aria-label="Introduction">
      <AmbientWeb />

      <div className="hero__mask-split" aria-hidden="true">
        <div className="hero__mask-left"><div className="hero__mask-symbol">🕷</div></div>
        <div className="hero__mask-right"><div className="hero__mask-symbol">🕸</div></div>
      </div>

      {/* ── Main content block ─────────────────── */}
      <div className="hero__content">
        <p className="hero__greeting font-mono hero__swing">
          <span className="hero__greeting-line" aria-hidden="true" />
          {personal.tagline}
        </p>

        <div className="hero__name-wrap">
          <SpiderSense active={senseActive} />
          <h1 className="hero__name font-display hero__swing hero__swing--delay-1">
            BALASHNE<span className="hero__name--accent">KITHAA</span>
          </h1>
        </div>

        <p className="hero__sub fade-up delay-2" aria-label={skillsTicker}>
          <span className="hero__sub-static">{skillsTicker}</span>
          <span className="hero__sub-marquee" aria-hidden="true">
            <span>{skillsTicker} · </span>
            <span>{skillsTicker} · </span>
          </span>
        </p>

        <p className="hero__bio hero__swing hero__swing--delay-2">
          Building scalable web apps with a focus on real-world impact and intuitive design.
          Currently exploring how AI can reshape user experiences.
        </p>

        <div className="hero__cta hero__swing hero__swing--delay-3">
          <a
            href="#projects"
            className="btn btn--primary font-mono"
          >
            View My Work
          </a>
          <a
            href="#contact"
            className="btn btn--outline font-mono"
          >
            Get In Touch
          </a>
        </div>
      </div>

      {/* ── Mobile bottom stage ────────────────── */}
      {/* Visible only on mobile via CSS, pointer-events: none */}
      <div className="hero__mobile-stage" aria-hidden="true">
        {/* Glow halo */}
        <div className="hero__stage-glow" />

        {/* Web strand the spider hangs from */}
        <div className="hero__hang-strand" />

        {/* Hanging spider */}
        <span className="hero__mobile-spider">🕷</span>

        {/* Full web SVG behind everything */}
        <MobileWebScene />

        {/* Scroll-down cue */}
        <div className="hero__scroll-cue">
          <span className="hero__scroll-label">scroll</span>
          <div className="hero__scroll-line" />
          <div className="hero__scroll-dot" />
        </div>

        {/* Stats bar pinned to bottom of stage */}
        <div className="hero__stats">
          {[
            { num: '2+',  label: 'Years\nExp.' },
            { num: '10+', label: 'Projects\nBuilt' },
            { num: '3+', label: 'Tech\nStack' },
            { num: '∞',   label: 'Lines\nWritten' },
          ].map(({ num, label }) => (
            <div className="hero__stat" key={num}>
              <span className="hero__stat-num font-display">{num}</span>
              <span className="hero__stat-label font-mono">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop floating spider */}
      <span className="hero__spider" aria-hidden="true">🕷</span>
    </section>
  );
}