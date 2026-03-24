import { useEffect, useRef } from 'react';
import './WebGrid.css';

/**
 * WebGrid
 *
 * Full-viewport canvas rendered behind everything.
 * Draws a fine grid whose lines subtly curve toward the mouse —
 * as if the viewer stands in the centre of a vast spider web.
 *
 * Props:
 *   theme — 'light' | 'dark'  (controls stroke colour)
 */
export default function WebGrid({ theme }) {
  const canvasRef = useRef(null);
  const mouse     = useRef({ x: -9999, y: -9999 });
  const rafId     = useRef(null);

  useEffect(() => {
    const onMove = (e) => { mouse.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const COLS      = 18;
    const ROWS      = 14;
    const PULL      = 55;     // max pixel pull toward cursor
    const FALLOFF   = 380;    // distance at which pull fades to 0
    const FOOTER_BAND_RATIO = 0.2;

    const draw = () => {
      const W   = canvas.width;
      const H   = canvas.height;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, W, H);

      const isDark     = theme === 'dark';
      const lineColor  = isDark
        ? 'rgba(255,255,255,0.055)'
        : 'rgba(160,15,15,0.07)';
      const nodeColor  = isDark
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(160,15,15,0.14)';
      const footerLineColor = isDark
        ? 'rgba(255,255,255,0.14)'
        : 'rgba(130,12,12,0.13)';
      const footerNodeColor = isDark
        ? 'rgba(255,255,255,0.24)'
        : 'rgba(130,12,12,0.22)';

      const colW = W / COLS;
      const rowH = H / ROWS;

      // Build grid nodes with cursor-pull displacement
      const nodes = [];
      for (let row = 0; row <= ROWS; row++) {
        nodes[row] = [];
        for (let col = 0; col <= COLS; col++) {
          const bx   = col * colW;
          const by   = row * rowH;
          const dx   = mouse.current.x - bx;
          const dy   = mouse.current.y - by;
          const dist = Math.hypot(dx, dy);
          const pull = Math.max(0, 1 - dist / FALLOFF) * PULL;
          nodes[row][col] = {
            x: bx + (dx / Math.max(dist, 1)) * pull,
            y: by + (dy / Math.max(dist, 1)) * pull,
          };
        }
      }

      ctx.strokeStyle = lineColor;
      ctx.lineWidth   = 0.7;

      // Horizontal lines
      for (let row = 0; row <= ROWS; row++) {
        ctx.beginPath();
        for (let col = 0; col <= COLS; col++) {
          const { x, y } = nodes[row][col];
          if (col === 0) ctx.moveTo(x, y);
          else {
            // Slight quadratic curve using midpoint between prev and current
            const prev  = nodes[row][col - 1];
            const midX  = (prev.x + x) / 2;
            const midY  = (prev.y + y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
          }
        }
        ctx.stroke();
      }

      // Vertical lines
      for (let col = 0; col <= COLS; col++) {
        ctx.beginPath();
        for (let row = 0; row <= ROWS; row++) {
          const { x, y } = nodes[row][col];
          if (row === 0) ctx.moveTo(x, y);
          else {
            const prev  = nodes[row - 1][col];
            const midX  = (prev.x + x) / 2;
            const midY  = (prev.y + y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
          }
        }
        ctx.stroke();
      }

      // Intersection dots
      ctx.fillStyle = nodeColor;
      for (let row = 0; row <= ROWS; row++) {
        for (let col = 0; col <= COLS; col++) {
          const { x, y } = nodes[row][col];
          ctx.beginPath();
          ctx.arc(x, y, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Footer boost pass: keep motion identical, but increase visibility in the bottom band.
      const footerTopY = H * (1 - FOOTER_BAND_RATIO);

      ctx.strokeStyle = footerLineColor;
      ctx.lineWidth   = 0.95;

      // Horizontal lines in footer zone
      for (let row = 0; row <= ROWS; row++) {
        const rowY = nodes[row][0].y;
        if (rowY < footerTopY) continue;
        ctx.beginPath();
        for (let col = 0; col <= COLS; col++) {
          const { x, y } = nodes[row][col];
          if (col === 0) ctx.moveTo(x, y);
          else {
            const prev  = nodes[row][col - 1];
            const midX  = (prev.x + x) / 2;
            const midY  = (prev.y + y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
          }
        }
        ctx.stroke();
      }

      // Vertical segments that intersect footer zone
      for (let col = 0; col <= COLS; col++) {
        ctx.beginPath();
        let moved = false;
        for (let row = 0; row <= ROWS; row++) {
          const { x, y } = nodes[row][col];
          if (y < footerTopY) continue;
          if (!moved) {
            ctx.moveTo(x, y);
            moved = true;
          } else {
            const prev = nodes[row - 1][col];
            const midX = (prev.x + x) / 2;
            const midY = (prev.y + y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
          }
        }
        if (moved) ctx.stroke();
      }

      // Footer nodes
      ctx.fillStyle = footerNodeColor;
      for (let row = 0; row <= ROWS; row++) {
        for (let col = 0; col <= COLS; col++) {
          const { x, y } = nodes[row][col];
          if (y < footerTopY) continue;
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      rafId.current = requestAnimationFrame(draw);
    };

    rafId.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener('resize', resize);
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="web-grid-canvas" aria-hidden="true" />;
}