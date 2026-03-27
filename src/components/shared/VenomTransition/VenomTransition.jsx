import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import './VenomTransition.css';

/**
 * VenomTransition
 *
 * Exposed imperative API via ref:
 *   venomRef.current.trigger(themeToggleFn)
 *
 * Desktop sequence (blob from toggle button):
 *   1. Blob EXPANDS from toggle button, covering the whole screen
 *   2. At PEAK → themeToggleFn() is called under the blob
 *   3. Blob RECEDES back to origin, revealing the new theme
 *
 * Mobile sequence (ink drip from top):
 *   1. Venom ink pours down from the nav bar with organic drip tendrils
 *   2. Screen fully flooded → themeToggleFn() fires
 *   3. Ink retracts upward with a sticky pull-away effect
 */
const VenomTransition = forwardRef(function VenomTransition({ theme, originRef }, ref) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const activeRef = useRef(false);

  const isMobile = () => window.innerWidth <= 768;

  const getOrigin = useCallback(() => {
    if (originRef?.current) {
      const r = originRef.current.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return { x: window.innerWidth - 80, y: 32 };
  }, [originRef]);

  /* ─────────────────────────────────────────────────────────────────
     DESKTOP  — original organic blob animation (unchanged)
  ───────────────────────────────────────────────────────────────── */
  const runDesktop = useCallback((canvas, ctx, toggleFn, nextTheme) => {
    const origin = getOrigin();
    const maxR   = Math.hypot(
      Math.max(origin.x, canvas.width  - origin.x),
      Math.max(origin.y, canvas.height - origin.y)
    ) * 1.08;

    const fillColor = nextTheme === 'dark' ? '#09090e' : '#f5f0eb';
    const glowColor = nextTheme === 'dark'
      ? 'rgba(100,200,50,0.8)'
      : 'rgba(204,17,17,0.8)';

    const EXPAND_FRAMES = 36;
    const HOLD_FRAMES   = 4;
    const RECEDE_FRAMES = 30;

    let frame        = 0;
    let phase        = 'expand';
    let holdCount    = 0;
    let themeSwapped = false;

    const drawBlob = (radius, alpha) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (radius <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.min(alpha, 1);
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, radius, 0, Math.PI * 2);
      const satellites = 5;
      for (let i = 0; i < satellites; i++) {
        const angle  = (i / satellites) * Math.PI * 2;
        const jitter = radius * 0.05 * Math.sin(frame * 0.18 + i * 1.4);
        const dist   = radius * 0.12;
        ctx.arc(
          origin.x + Math.cos(angle) * dist,
          origin.y + Math.sin(angle) * dist,
          radius * 0.92 + jitter,
          0, Math.PI * 2
        );
      }
      ctx.shadowBlur  = 32;
      ctx.shadowColor = glowColor;
      ctx.fillStyle   = fillColor;
      ctx.fill('evenodd');
      ctx.restore();
    };

    const easeInCubic  = t => t * t * t;
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

    canvas.style.opacity       = '1';
    canvas.style.pointerEvents = 'all';

    const animate = () => {
      frame++;
      if (phase === 'expand') {
        const t      = Math.min(frame / EXPAND_FRAMES, 1);
        const radius = maxR * easeInCubic(t);
        drawBlob(radius, Math.min(t * 4, 1));
        if (t >= 1) { phase = 'hold'; holdCount = 0; }

      } else if (phase === 'hold') {
        drawBlob(maxR, 1);
        if (!themeSwapped) { themeSwapped = true; toggleFn(); }
        holdCount++;
        if (holdCount >= HOLD_FRAMES) { phase = 'recede'; frame = 0; }

      } else if (phase === 'recede') {
        const t      = Math.min(frame / RECEDE_FRAMES, 1);
        const radius = maxR * (1 - easeOutCubic(t));
        drawBlob(radius, Math.max(1 - t * 1.2, 0));
        if (t >= 1) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          canvas.style.opacity       = '0';
          canvas.style.pointerEvents = 'none';
          activeRef.current = false;
          return;
        }
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
  }, [getOrigin]);

  /* ─────────────────────────────────────────────────────────────────
     MOBILE  — venom ink drip from top nav
     
     Phases:
       'flood'   — ink sheet slides down from y=0, drip tendrils grow
       'hold'    — fully covering, theme swaps here
       'retract' — ink peels back upward with sticky strands
  ───────────────────────────────────────────────────────────────── */
  const runMobile = useCallback((canvas, ctx, toggleFn, nextTheme) => {
    const W = canvas.width;
    const H = canvas.height;

    const inkColor  = nextTheme === 'dark' ? '#09090e' : '#f5f0eb';
    const glowColor = nextTheme === 'dark'
      ? 'rgba(80,200,40,0.9)'
      : 'rgba(220,20,20,0.9)';
    const strandColor = nextTheme === 'dark'
      ? 'rgba(80,200,40,0.55)'
      : 'rgba(220,20,20,0.45)';

    // Seeded pseudo-random so drips are consistent each run
    let seed = 42;
    const rand = (min, max) => {
      seed = (seed * 16807 + 0) % 2147483647;
      return min + ((seed / 2147483647) * (max - min));
    };

    // ── Drip tendrils ──────────────────────────────────────────────
    // Each drip has an x position, a length (relative to flood level),
    // a width, and a phase offset so they don't all move in sync
    const DRIP_COUNT = 9;
    const drips = Array.from({ length: DRIP_COUNT }, (_, i) => ({
      x:          (i + 0.5) * (W / DRIP_COUNT) + rand(-18, 18),
      lenFactor:  rand(0.10, 0.28),   // how far below flood edge it extends
      width:      rand(5, 16),
      phaseOff:   rand(0, Math.PI * 2),
      wobble:     rand(0.5, 1.4),
    }));

    // ── Retract strands — sticky threads left behind ───────────────
    const STRAND_COUNT = 6;
    const strands = Array.from({ length: STRAND_COUNT }, (_, i) => ({
      x:     rand(W * 0.08, W * 0.92),
      width: rand(2, 7),
      delay: rand(0, 0.35),  // strands snap at different times
    }));

    const FLOOD_FRAMES   = 38;
    const HOLD_FRAMES    = 6;
    const RETRACT_FRAMES = 34;

    let frame        = 0;
    let phase        = 'flood';
    let holdCount    = 0;
    let themeSwapped = false;

    // Easing
    const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
    const easeInQuart  = t => t * t * t * t;
    const easeInOutCubic = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;

    /* Draw the main ink flood rectangle + organic bottom edge */
    const drawFloodEdge = (floodY, alpha, wobbleAmt) => {
      ctx.save();
      ctx.globalAlpha = Math.min(alpha, 1);

      // Glow bloom at the leading edge
      const grad = ctx.createLinearGradient(0, floodY - 24, 0, floodY + 32);
      grad.addColorStop(0, inkColor);
      grad.addColorStop(0.6, inkColor);
      grad.addColorStop(1, 'transparent');
      ctx.shadowBlur  = 28;
      ctx.shadowColor = glowColor;

      // Main flood body (rect from top to floodY)
      ctx.fillStyle = inkColor;
      ctx.fillRect(0, 0, W, floodY);

      // Organic wavy bottom edge using bezier curves
      ctx.beginPath();
      ctx.moveTo(0, floodY);
      const segs = 8;
      for (let i = 0; i <= segs; i++) {
        const sx = (i / segs) * W;
        const sy = floodY + Math.sin(frame * 0.07 + i * 1.1) * wobbleAmt
                          + Math.cos(frame * 0.05 + i * 0.7) * wobbleAmt * 0.5;
        if (i === 0) ctx.moveTo(sx, sy);
        else         ctx.lineTo(sx, sy);
      }
      ctx.lineTo(W, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fillStyle = inkColor;
      ctx.fill();

      ctx.restore();
    };

    /* Draw individual drip tentacles */
    const drawDrips = (floodY, t, alpha) => {
      drips.forEach((d) => {
        // Drip length grows as flood advances, with per-drip phase
        const dripProgress = Math.max(0, t - 0.15);
        const dripLen = H * d.lenFactor * easeOutQuart(dripProgress)
                      * (0.85 + 0.15 * Math.sin(frame * d.wobble + d.phaseOff));
        if (dripLen < 2) return;

        const tipY = floodY + dripLen;
        const wobX = Math.sin(frame * 0.06 * d.wobble + d.phaseOff) * 4;

        ctx.save();
        ctx.globalAlpha = Math.min(alpha * 0.95, 1);
        ctx.shadowBlur  = 18;
        ctx.shadowColor = glowColor;

        // Drip body — tapered shape
        const grad = ctx.createLinearGradient(0, floodY, 0, tipY);
        grad.addColorStop(0, inkColor);
        grad.addColorStop(0.7, inkColor);
        grad.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.moveTo(d.x + wobX - d.width / 2, floodY);
        ctx.quadraticCurveTo(
          d.x + wobX + d.width * 0.6, floodY + dripLen * 0.5,
          d.x + wobX, tipY
        );
        ctx.quadraticCurveTo(
          d.x + wobX - d.width * 0.6, floodY + dripLen * 0.5,
          d.x + wobX - d.width / 2, floodY
        );
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Bulb at drip tip
        const bulbR = d.width * 0.55 * (0.9 + 0.1 * Math.sin(frame * 0.12 + d.phaseOff));
        ctx.beginPath();
        ctx.arc(d.x + wobX, tipY, bulbR, 0, Math.PI * 2);
        ctx.fillStyle = inkColor;
        ctx.fill();

        ctx.restore();
      });
    };

    /* Draw retract strands — sticky threads that snap as ink pulls away */
    const drawStrands = (retractY, t, floodAlpha) => {
      strands.forEach((s) => {
        // Each strand lives until its snap delay is passed
        const snapT = Math.max(0, (t - s.delay) / (1 - s.delay));
        if (snapT >= 1) return; // snapped — gone

        const strandTop    = retractY;
        const strandBottom = H * (1 - snapT * snapT); // snaps upward fast

        const stretch = strandBottom - strandTop;
        if (stretch < 2) return;

        ctx.save();
        ctx.globalAlpha = Math.min(floodAlpha * (1 - snapT * 0.8), 0.85);
        ctx.shadowBlur  = 12;
        ctx.shadowColor = glowColor;

        // Strand tapers from wide at bottom to thin at top
        const grad = ctx.createLinearGradient(0, strandTop, 0, strandBottom);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.3, strandColor);
        grad.addColorStop(1, inkColor);

        const topW  = s.width * 0.2 * (1 - snapT);
        const botW  = s.width * (1 - snapT * 0.6);
        const midX  = s.x + Math.sin(snapT * Math.PI) * 8; // slight bow

        ctx.beginPath();
        ctx.moveTo(s.x - topW, strandTop);
        ctx.quadraticCurveTo(midX, strandTop + stretch * 0.5, s.x - botW, strandBottom);
        ctx.lineTo(s.x + botW, strandBottom);
        ctx.quadraticCurveTo(midX, strandTop + stretch * 0.5, s.x + topW, strandTop);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.restore();
      });
    };

    canvas.style.opacity       = '1';
    canvas.style.pointerEvents = 'all';

    const animate = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);

      if (phase === 'flood') {
        const t       = Math.min(frame / FLOOD_FRAMES, 1);
        const floodY  = H * easeOutQuart(t);
        const alpha   = Math.min(t * 5, 1);
        const wobble  = 6 * Math.sin(t * Math.PI); // waves peak mid-flood

        drawFloodEdge(floodY, alpha, wobble);
        drawDrips(floodY, t, alpha);

        if (t >= 1) { phase = 'hold'; holdCount = 0; }

      } else if (phase === 'hold') {
        // Fully covering — solid fill + subtle pulse
        ctx.save();
        ctx.fillStyle = inkColor;
        ctx.fillRect(0, 0, W, H);
        // Pulse glow at centre
        const pulse = 0.04 + 0.03 * Math.sin(holdCount * 0.8);
        ctx.globalAlpha = pulse;
        const radGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W * 0.6);
        radGrad.addColorStop(0, glowColor);
        radGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();

        if (!themeSwapped) { themeSwapped = true; toggleFn(); }
        holdCount++;
        if (holdCount >= HOLD_FRAMES) { phase = 'retract'; frame = 0; }

      } else if (phase === 'retract') {
        const t        = Math.min(frame / RETRACT_FRAMES, 1);
        // Ink peels upward — starts slow (sticky), then snaps away
        const retractT = easeInQuart(t);
        const retractY = H * (1 - retractT);
        const alpha    = Math.max(1 - t * 0.15, 0); // stays mostly opaque till end

        // Remaining flood body above retract line
        ctx.save();
        ctx.fillStyle   = inkColor;
        ctx.globalAlpha = alpha;
        ctx.fillRect(0, 0, W, retractY);
        ctx.restore();

        // Organic top edge of retreating ink (same wavy treatment, mirrored)
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur  = 22;
        ctx.shadowColor = glowColor;
        ctx.beginPath();
        const segs = 8;
        ctx.moveTo(0, retractY);
        for (let i = 0; i <= segs; i++) {
          const sx = (i / segs) * W;
          const sy = retractY + Math.sin(frame * 0.09 + i * 1.2) * (6 * (1 - t));
          if (i === 0) ctx.moveTo(sx, sy);
          else         ctx.lineTo(sx, sy);
        }
        ctx.lineTo(W, 0);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fillStyle = inkColor;
        ctx.fill();
        ctx.restore();

        // Sticky strands left behind
        drawStrands(retractY, t, alpha);

        if (t >= 1) {
          ctx.clearRect(0, 0, W, H);
          canvas.style.opacity       = '0';
          canvas.style.pointerEvents = 'none';
          activeRef.current = false;
          return;
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
  }, []);

  /* ─────────────────────────────────────────────────────────────────
     trigger() — entry point called by App on theme button click
  ───────────────────────────────────────────────────────────────── */
  const trigger = useCallback((toggleFn) => {
    if (activeRef.current) return;
    activeRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) { toggleFn(); activeRef.current = false; return; }

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    const nextTheme = theme === 'light' ? 'dark' : 'light';

    cancelAnimationFrame(animRef.current);

    if (isMobile()) {
      runMobile(canvas, ctx, toggleFn, nextTheme);
    } else {
      runDesktop(canvas, ctx, toggleFn, nextTheme);
    }
  }, [theme, runDesktop, runMobile]);

  useImperativeHandle(ref, () => ({ trigger }), [trigger]);

  return (
    <canvas
      ref={canvasRef}
      className="venom-canvas"
      aria-hidden="true"
    />
  );
});

export default VenomTransition;