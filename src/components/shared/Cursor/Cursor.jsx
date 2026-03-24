import { useEffect, useRef, useState } from 'react';
import './Cursor.css';

const TRAIL_LENGTH = 14;
const TRAIL_INTERVAL = 60;

function supportsCustomCursor() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export default function Cursor() {
  const dotRef    = useRef(null);
  const ringRef   = useRef(null);
  const crossRef  = useRef(null);
  const canvasRef = useRef(null);
  const pos       = useRef({ x: -200, y: -200 });
  const ringPos   = useRef({ x: -200, y: -200 });
  const trail     = useRef([]);
  const rafId     = useRef(null);
  const trailTick = useRef(null);
  const hoveringRef = useRef(false);
  const minimalRef  = useRef(false);
  const [enabled, setEnabled] = useState(() => supportsCustomCursor());
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const onChange = () => setEnabled(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  // Mouse position
  useEffect(() => {
    if (!enabled) return;
    const onMove = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      pos.current = { x, y };

      const el = document.elementFromPoint(x, y);
      const isMinimal = !!el?.closest('[data-cursor-minimal]');
      if (isMinimal !== minimalRef.current) {
        minimalRef.current = isMinimal;
      }

      const isInteractive = !!el?.closest('a, button, [data-hover]');
      const shouldHover = isInteractive && !isMinimal;
      if (shouldHover !== hoveringRef.current) {
        hoveringRef.current = shouldHover;
        setHovering(shouldHover);
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Trail position sampling
  useEffect(() => {
    if (!enabled) return;
    trailTick.current = setInterval(() => {
      trail.current.push({ ...pos.current });
      if (trail.current.length > TRAIL_LENGTH) trail.current.shift();
    }, TRAIL_INTERVAL);
    return () => clearInterval(trailTick.current);
  }, []);

  // Canvas resize
  useEffect(() => {
    if (!enabled) return;
    const resize = () => {
      if (!canvasRef.current) return;
      canvasRef.current.width  = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // RAF loop
  useEffect(() => {
    if (!enabled) return;
    const loop = () => {
      const { x, y } = pos.current;
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

      // Dot
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${x - 4}px, ${y - 4}px)`;
      }

      // Ring lerp
      ringPos.current.x += (x - ringPos.current.x) * 0.10;
      ringPos.current.y += (y - ringPos.current.y) * 0.10;
      const rx = ringPos.current.x;
      const ry = ringPos.current.y;

      if (ringRef.current) {
        const s = minimalRef.current ? 1.0 : (hoveringRef.current ? 2.0 : 1.0);
        ringRef.current.style.transform = `translate(${rx - 14}px, ${ry - 14}px) scale(${s})`;
        ringRef.current.style.opacity = minimalRef.current
          ? '0'
          : (hoveringRef.current ? '0.85' : '0.55');
      }

      // Crosshair
      if (crossRef.current) {
        crossRef.current.style.transform = `translate(${rx - 10}px, ${ry - 10}px)`;
        crossRef.current.style.opacity = minimalRef.current ? '0' : (hoveringRef.current ? '1' : '0');
      }

      // Trail canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (minimalRef.current) {
          rafId.current = requestAnimationFrame(loop);
          return;
        }
        const pts = [{ x, y }, ...trail.current.slice().reverse()];
        if (pts.length > 2) {
          for (let i = 1; i < pts.length - 1; i++) {
            const t     = 1 - i / pts.length;
            const alpha = t * 0.5;
            const lw    = t * 1.4;
            const cpx   = (pts[i - 1].x + pts[i].x) / 2;
            const cpy   = (pts[i - 1].y + pts[i].y) / 2;
            ctx.beginPath();
            ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
            ctx.quadraticCurveTo(cpx, cpy, pts[i].x, pts[i].y);
            ctx.strokeStyle = isDark
              ? `rgba(255,255,255,${alpha})`
              : `rgba(170,10,10,${alpha})`;
            ctx.lineWidth = lw;
            ctx.lineCap   = 'round';
            ctx.stroke();
          }
        }
      }

      rafId.current = requestAnimationFrame(loop);
    };
    rafId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId.current);
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <>
      <canvas ref={canvasRef} className="cursor-canvas" aria-hidden="true" />
      <span   ref={dotRef}   className="cursor-dot"   aria-hidden="true" />
      <span
        ref={ringRef}
        className={`cursor-ring${hovering ? ' cursor-ring--hover' : ''}`}
        aria-hidden="true"
      />
      <span ref={crossRef} className="cursor-cross" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="10" y1="0"  x2="10" y2="7"  stroke="currentColor" strokeWidth="1.2"/>
          <line x1="10" y1="13" x2="10" y2="20" stroke="currentColor" strokeWidth="1.2"/>
          <line x1="0"  y1="10" x2="7"  y2="10" stroke="currentColor" strokeWidth="1.2"/>
          <line x1="13" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="0.9"/>
          <line x1="7.8" y1="7.8" x2="12.2" y2="12.2" stroke="currentColor" strokeWidth="0.7" opacity="0.6"/>
          <line x1="12.2" y1="7.8" x2="7.8" y2="12.2" stroke="currentColor" strokeWidth="0.7" opacity="0.6"/>
        </svg>
      </span>
    </>
  );
}