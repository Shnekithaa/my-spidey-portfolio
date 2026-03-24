import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import './VenomTransition.css';

/**
 * VenomTransition
 *
 * Exposed imperative API via ref:
 *   venomRef.current.trigger(themeToggleFn)
 *
 * Sequence:
 *   1. Blob EXPANDS from toggle button, covering the whole screen
 *   2. At PEAK (screen fully covered) → themeToggleFn() is called
 *      (theme swaps while hidden under the blob)
 *   3. Blob RECEDES back to origin, revealing the new theme beneath
 */
const VenomTransition = forwardRef(function VenomTransition({ theme, originRef }, ref) {
  const canvasRef  = useRef(null);
  const animRef    = useRef(null);
  const activeRef  = useRef(false);

  const getOrigin = useCallback(() => {
    if (originRef?.current) {
      const r = originRef.current.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return { x: window.innerWidth - 80, y: 32 };
  }, [originRef]);

  /**
   * trigger(toggleFn)
   * Called by App when the user clicks the theme button.
   * Runs expand → peak (swap) → recede sequence.
   */
  const trigger = useCallback((toggleFn) => {
    if (activeRef.current) return; // prevent double-trigger mid-animation
    activeRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) { toggleFn(); activeRef.current = false; return; }

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    const origin = getOrigin();
    const maxR   = Math.hypot(
      Math.max(origin.x, canvas.width  - origin.x),
      Math.max(origin.y, canvas.height - origin.y)
    ) * 1.08;

    // The blob colour is the NEW theme's background
    // (we peek at what theme will become after toggle)
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    const fillColor  = nextTheme === 'dark' ? '#09090e' : '#f5f0eb';
    const glowColor  = nextTheme === 'dark'
      ? 'rgba(100,200,50,0.8)'
      : 'rgba(204,17,17,0.8)';

    const EXPAND_FRAMES = 36;
    const HOLD_FRAMES   = 4;   // brief pause at peak so swap is invisible
    const RECEDE_FRAMES = 30;

    let frame        = 0;
    let phase        = 'expand'; // 'expand' | 'hold' | 'recede'
    let holdCount    = 0;
    let themeSwapped = false;

    const drawBlob = (radius, alpha) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (radius <= 0) return;

      ctx.save();
      ctx.globalAlpha = Math.min(alpha, 1);

      // Organic blob: main circle + small offset satellites for liquid feel
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, radius, 0, Math.PI * 2);

      const satellites = 5;
      for (let i = 0; i < satellites; i++) {
        const angle   = (i / satellites) * Math.PI * 2;
        const jitter  = radius * 0.05 * Math.sin(frame * 0.18 + i * 1.4);
        const dist    = radius * 0.12;
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
      ctx.fill('evenodd'); // creates organic cutouts for liquid look
      ctx.restore();
    };

    // easing functions
    const easeInCubic  = t => t * t * t;
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

    canvas.style.opacity       = '1';
    canvas.style.pointerEvents = 'all';

    cancelAnimationFrame(animRef.current);

    const animate = () => {
      frame++;

      if (phase === 'expand') {
        const t      = Math.min(frame / EXPAND_FRAMES, 1);
        const radius = maxR * easeInCubic(t);
        const alpha  = Math.min(t * 4, 1); // fade in quickly
        drawBlob(radius, alpha);

        if (t >= 1) {
          phase = 'hold';
          holdCount = 0;
        }

      } else if (phase === 'hold') {
        // Screen fully covered — swap theme NOW while invisible
        drawBlob(maxR, 1);
        if (!themeSwapped) {
          themeSwapped = true;
          toggleFn(); // 🎯 theme swaps here, under the blob
        }
        holdCount++;
        if (holdCount >= HOLD_FRAMES) {
          phase = 'recede';
          frame = 0;
        }

      } else if (phase === 'recede') {
        const t      = Math.min(frame / RECEDE_FRAMES, 1);
        const radius = maxR * (1 - easeOutCubic(t));
        const alpha  = Math.max(1 - t * 1.2, 0);
        drawBlob(radius, alpha);

        if (t >= 1) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          canvas.style.opacity       = '0';
          canvas.style.pointerEvents = 'none';
          activeRef.current = false;
          return; // stop loop
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
  }, [theme, getOrigin]);

  // Expose trigger() to parent via ref
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