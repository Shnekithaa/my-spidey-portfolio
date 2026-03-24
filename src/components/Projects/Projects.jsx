import { useState, useRef, useCallback, useEffect } from 'react';
import { projects } from '../../data/portfolio';
import WebSVG from '../shared/WebSVG/WebSVG';
import SectionHeader from '../shared/SectionHeader/SectionHeader';
import './Projects.css';

const ANCHORS = ['top-left', 'top-right', 'bottom-left'];

/* ── Web strand SVG overlay drawn during card drag ─────────────── */
function WebStrand({ active, origin, target }) {
  if (!active) return null;

  const dx  = target.x - origin.x;
  const dy  = target.y - origin.y;
  const len = Math.hypot(dx, dy);

  // Bezier control point — bows upward like a real hanging web strand
  const cpx = origin.x + dx * 0.4;
  const cpy = origin.y + dy * 0.2 - Math.min(len * 0.35, 160);

  // Sample points along the bezier for web nodes
  const nodeCount = 5;
  const nodes = Array.from({ length: nodeCount }, (_, i) => {
    const t  = (i + 1) / (nodeCount + 1);
    const mt = 1 - t;
    return {
      x: mt * mt * origin.x + 2 * mt * t * cpx + t * t * target.x,
      y: mt * mt * origin.y + 2 * mt * t * cpy + t * t * target.y,
    };
  });

  // Small web-cross at anchor point (origin)
  const crossAngles = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <svg className="proj__strand-svg" aria-hidden="true">
      <defs>
        {/* Accent-colour gradient matching theme (red/green) */}
        <linearGradient id="strandGrad"
          gradientUnits="userSpaceOnUse"
          x1={origin.x} y1={origin.y} x2={target.x} y2={target.y}>
          <stop offset="0%"   stopColor="var(--accent)"        stopOpacity="1"   />
          <stop offset="60%"  stopColor="var(--accent-bright)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="var(--accent)"        stopOpacity="0.1" />
        </linearGradient>
        {/* Glow filter */}
        <filter id="strandGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="nodeGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Glow shadow path (blurred, behind) ── */}
      <path
        d={`M ${origin.x} ${origin.y} Q ${cpx} ${cpy} ${target.x} ${target.y}`}
        stroke="var(--glow)"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        filter="url(#strandGlow)"
      />

      {/* ── Main strand — thick accent colour ── */}
      <path
        d={`M ${origin.x} ${origin.y} Q ${cpx} ${cpy} ${target.x} ${target.y}`}
        stroke="url(#strandGrad)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Parallel thin strand (realism) ── */}
      <path
        d={`M ${origin.x + 5} ${origin.y + 2} Q ${cpx + 10} ${cpy - 8} ${target.x + 5} ${target.y + 2}`}
        stroke="var(--accent)"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* ── Web nodes along strand ── */}
      {nodes.map((n, i) => (
        <g key={i} filter="url(#nodeGlow)">
          <circle cx={n.x} cy={n.y} r={3.5}
            fill="none" stroke="var(--accent)" strokeWidth="1.2" opacity="0.9" />
          <circle cx={n.x} cy={n.y} r={1.5}
            fill="var(--accent)" />
          <line x1={n.x - 5} y1={n.y} x2={n.x + 5} y2={n.y}
            stroke="var(--accent)" strokeWidth="0.6" opacity="0.45" />
          <line x1={n.x} y1={n.y - 5} x2={n.x} y2={n.y + 5}
            stroke="var(--accent)" strokeWidth="0.6" opacity="0.45" />
        </g>
      ))}

      {/* ── Web-cross anchor at origin (card centre) ── */}
      {crossAngles.map((a, i) => {
        const rad = (a * Math.PI) / 180;
        const shortLen = i % 2 === 0 ? 18 : 11;
        return (
          <line key={a}
            x1={origin.x} y1={origin.y}
            x2={origin.x + Math.cos(rad) * shortLen}
            y2={origin.y + Math.sin(rad) * shortLen}
            stroke="var(--accent)"
            strokeWidth={i % 2 === 0 ? 1.2 : 0.7}
            opacity="0.6"
          />
        );
      })}
      {/* Anchor centre dot */}
      <circle cx={origin.x} cy={origin.y} r={4}
        fill="var(--accent)"
        opacity="0.9"
        filter="url(#nodeGlow)" />
    </svg>
  );
}

/* ── Single project card ──────────────────────────────────────────── */
function ProjectCard({
  proj, stackIndex, total,
  dragState, onDragStart, onDragMove, onDragEnd,
  isTop, isDismissing, dismissDir,
}) {
  const cardRef   = useRef(null);
  const { num, title, sub, desc, tech, liveUrl, githubUrl, date, type } = proj;

  // Stack visual offset — back cards are slightly smaller + shifted down
  const depth  = stackIndex; // 0 = top
  const scale  = 1 - depth * 0.045;
  const yShift = depth * 14;
  const xShift = depth * 2;

  let transform = `translateY(${yShift}px) translateX(${xShift}px) scale(${scale})`;
  let transition = 'transform 0.35s cubic-bezier(0.34,1.3,0.64,1), opacity 0.35s ease, box-shadow 0.3s ease';
  let opacity  = 1 - depth * 0.15;
  let zIndex   = total - depth;
  let cursor   = isTop ? 'grab' : 'default';
  let boxShadow = undefined;

  // Top card follows drag
  if (isTop && dragState.dragging) {
    const { dx, dy } = dragState;
    const rot = dx * 0.04;
    transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
    transition = 'none';
    cursor = 'grabbing';
    boxShadow = `0 20px 60px rgba(0,0,0,0.35), 0 0 30px var(--glow)`;
  }

  // Dismiss flyoff — web pulls card to top-right corner
  if (isDismissing) {
    const flyX = dismissDir === 'right' ? window.innerWidth * 0.8  : -window.innerWidth * 0.8;
    const flyY = -window.innerHeight * 0.6;
    const rot  = dismissDir === 'right' ? 35 : -35;
    transform  = `translate(${flyX}px, ${flyY}px) rotate(${rot}deg) scale(0.6)`;
    transition = 'transform 0.55s cubic-bezier(0.55,0,0.8,0.45), opacity 0.45s ease';
    opacity    = 0;
  }

  const handleMouseDown = useCallback((e) => {
    if (!isTop) return;
    e.preventDefault();
    const rect = cardRef.current.getBoundingClientRect();
    onDragStart({
      startX: e.clientX, startY: e.clientY,
      originX: rect.left + rect.width / 2,
      originY: rect.top  + rect.height / 2,
    });
  }, [isTop, onDragStart]);

  const handleTouchStart = useCallback((e) => {
    if (!isTop) return;
    const t = e.touches[0];
    const rect = cardRef.current.getBoundingClientRect();
    onDragStart({
      startX: t.clientX, startY: t.clientY,
      originX: rect.left + rect.width / 2,
      originY: rect.top  + rect.height / 2,
    });
  }, [isTop, onDragStart]);

  return (
    <div
      ref={cardRef}
      className={`proj__card-wrap${isTop ? ' proj__card-wrap--top' : ''}`}
      style={{ transform, transition, opacity, zIndex, cursor, boxShadow }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      data-proj-card
      data-cursor-minimal
    >
      {/* Inner card — preserves WebCard look without the component
          (we manage transforms on the outer wrapper) */}
      <div className={`proj__card web-card web-card-proj`}
        data-anchor={ANCHORS[num - 1] || 'top-left'}>

        {/* Web SVG corner effect */}
        <span className="web-card__web" aria-hidden="true">
          <WebSVG anchor={ANCHORS[(parseInt(num) - 1) % ANCHORS.length]} />
        </span>

        <div className="web-card__content">
          {/* Top row */}
          <div className="proj__top">
            <span className="proj__num font-display" aria-hidden="true">{num}</span>
            <div className="proj__meta">
              <span className="proj__type font-mono">{type}</span>
              <span className="proj__date font-mono">{date}</span>
            </div>
          </div>

          <h3 className="proj__title font-display">{title.toUpperCase()}</h3>
          <p className="proj__sub">{sub}</p>
          <p className="proj__desc">{desc}</p>

          <ul className="proj__tech" role="list">
            {tech.map((t) => (
              <li key={t} className="proj__tech-item font-mono">{t}</li>
            ))}
          </ul>

          {(liveUrl || githubUrl) && (
            <div className="proj__actions">
              {liveUrl && (
                <a href={liveUrl} target="_blank" rel="noreferrer"
                  className="proj__link font-mono"
                  aria-label={`Open live project for ${title}`}
                  onClick={e => e.stopPropagation()}
                >
                  Live Demo <span className="proj__link-arrow">→</span>
                </a>
              )}

              {githubUrl && (
                <a href={githubUrl} target="_blank" rel="noreferrer"
                  className="proj__gh-link"
                  aria-label={`View ${title} on GitHub`}
                  onClick={e => e.stopPropagation()}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path fill="currentColor" d="M12 0.5C5.37 0.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.2 11.38 0.6 0.1 0.82-0.26 0.82-0.58 0-0.29-0.01-1.23-0.01-2.23-3.34 0.73-4.04-1.42-4.04-1.42-0.55-1.39-1.33-1.76-1.33-1.76-1.09-0.75 0.08-0.73 0.08-0.73 1.2 0.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.49 1 0.11-0.78 0.42-1.31 0.76-1.61-2.67-0.3-5.48-1.34-5.48-5.95 0-1.31 0.47-2.38 1.24-3.22-0.12-0.3-0.54-1.52 0.12-3.17 0 0 1.01-0.32 3.3 1.23a11.4 11.4 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23 0.66 1.65 0.24 2.87 0.12 3.17 0.77 0.84 1.24 1.91 1.24 3.22 0 4.62-2.81 5.64-5.49 5.94 0.43 0.38 0.82 1.1 0.82 2.23 0 1.61-0.01 2.9-0.01 3.3 0 0.32 0.21 0.69 0.82 0.58A12 12 0 0 0 24 12.5C24 5.87 18.63 0.5 12 0.5z"/>
                  </svg>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Multiverse stack controller ──────────────────────────────────── */
export default function Projects() {
  const total      = projects.length;
  const [order, setOrder]           = useState(() => projects.map((_, i) => i));
  const [dismissing, setDismissing] = useState(null);   // index being dismissed
  const [dismissDir, setDismissDir] = useState('right');
  const [dragState, setDragState]   = useState({ dragging: false, dx: 0, dy: 0 });
  const [strandActive, setStrandActive] = useState(false);
  const [strandOrigin, setStrandOrigin] = useState({ x: 0, y: 0 });
  const [strandTarget, setStrandTarget] = useState({ x: 0, y: 0 });
  const dragRef = useRef({});

  // Global mouse/touch move + up
  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.dragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - dragRef.current.startX;
      const dy = clientY - dragRef.current.startY;
      dragRef.current.dx = dx;
      dragRef.current.dy = dy;
      setDragState({ dragging: true, dx, dy });

      // Animate web strand toward cursor
      setStrandActive(true);
      setStrandTarget({ x: clientX, y: clientY });
    };

    const onUp = (e) => {
      if (!dragRef.current.dragging) return;
      const { dx, dy } = dragRef.current;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const isDismissGesture = absDx > 130 && absDx > absDy * 1.15;

      if (isDismissGesture) {
        const dir = dx > 0 ? 'right' : 'left';
        dismiss(dir);
      } else {
        // Snap back
        setDragState({ dragging: false, dx: 0, dy: 0 });
        setStrandActive(false);
      }
      dragRef.current.dragging = false;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend',  onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
    };
  }, [order]); // eslint-disable-line

  const handleDragStart = useCallback(({ startX, startY, originX, originY }) => {
    dragRef.current = { dragging: true, startX, startY, dx: 0, dy: 0 };
    setStrandOrigin({ x: originX, y: originY });
    setStrandActive(true);
    setStrandTarget({ x: startX, y: startY });
    setDragState({ dragging: true, dx: 0, dy: 0 });
  }, []);

  const dismiss = useCallback((dir) => {
    const topIdx = order[0];
    setDismissDir(dir);
    setDismissing(topIdx);
    setDragState({ dragging: false, dx: 0, dy: 0 });

    // Keep strand aligned with card fly-off trajectory.
    const flyX = dir === 'right' ? window.innerWidth * 0.8 : -window.innerWidth * 0.8;
    const flyY = -window.innerHeight * 0.6;
    setStrandTarget({
      x: strandOrigin.x + flyX,
      y: strandOrigin.y + flyY,
    });

    setTimeout(() => {
      setOrder(prev => [...prev.slice(1), prev[0]]); // rotate array
      setDismissing(null);
      setStrandActive(false);
    }, 560);
  }, [order, strandOrigin]);

  const handlePrev = useCallback(() => {
    // Bring last card back to front
    setOrder(prev => [prev[prev.length - 1], ...prev.slice(0, -1)]);
  }, []);

  const topProjectIndex = order[0];

  return (
    <section id="projects" className="projects section-base" aria-label="Projects">
      <SectionHeader num="04" label="What I've Built" title="PROJECTS" />

      <div className="projects__layout">
        {/* ── Stack area ── */}
        <div className="projects__stack-area">
          <WebStrand
            active={strandActive}
            origin={strandOrigin}
            target={strandTarget}
          />

          <div className="projects__stack">
            {/* Render back-to-front so top card is on top */}
            {[...order].reverse().map((projIndex, revI) => {
              const stackIndex = order.length - 1 - revI; // 0 = top
              const isTop      = stackIndex === 0;
              const isDism     = dismissing === projIndex;
              return (
                <ProjectCard
                  key={projIndex}
                  proj={projects[projIndex]}
                  stackIndex={stackIndex}
                  total={total}
                  dragState={isTop ? dragState : { dragging: false, dx: 0, dy: 0 }}
                  onDragStart={handleDragStart}
                  isTop={isTop}
                  isDismissing={isDism}
                  dismissDir={dismissDir}
                />
              );
            })}
          </div>

          {/* Swipe hint shown on first render */}
          <div className="projects__hint font-mono" aria-hidden="true">
            ← drag to flick →
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="projects__controls">
          {/* Project dots */}
          <div className="projects__dots" role="tablist" aria-label="Project navigation">
            {projects.map((p, i) => (
              <button
                key={i}
                className={`projects__dot${order[0] === i ? ' projects__dot--active' : ''}`}
                role="tab"
                aria-selected={order[0] === i}
                aria-label={`Project ${i + 1}: ${p.title}`}
                onClick={() => {
                  // Rotate order so clicked project is on top
                  setOrder(prev => {
                    const pos = prev.indexOf(i);
                    return [...prev.slice(pos), ...prev.slice(0, pos)];
                  });
                }}
              />
            ))}
          </div>

          {/* Prev / Next buttons */}
          <div className="projects__nav-btns">
            <button className="projects__nav-btn font-mono" onClick={handlePrev} aria-label="Previous project">
              ← prev
            </button>
            <button className="projects__nav-btn projects__nav-btn--next font-mono"
              onClick={() => dismiss('right')}
              aria-label="Next project"
            >
              next →
            </button>
          </div>

          {/* Current project counter */}
          <p className="projects__counter font-mono">
            <span className="projects__counter-cur">{String(order[0] + 1).padStart(2,'0')}</span>
            <span className="projects__counter-sep"> / </span>
            <span className="projects__counter-tot">{String(total).padStart(2,'0')}</span>
          </p>
        </div>
      </div>
    </section>
  );
}