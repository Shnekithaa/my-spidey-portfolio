/**
 * WebSVG — naturalistic spider-web drawn from card corners and edges.
 * The web radiates from a chosen anchor (corner or mid-edge),
 * with realistic curved concentric rings and irregular radial threads.
 *
 * Props:
 *  anchor  — 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'right'
 *  opacity — number (applied to the whole group)
 */

const ANCHORS = {
  'top-left':     { cx: 0,   cy: 0,   startAngle: 0,   sweep: 90  },
  'top-right':    { cx: 400, cy: 0,   startAngle: 90,  sweep: 90  },
  'bottom-left':  { cx: 0,   cy: 300, startAngle: 270, sweep: 90  },
  'bottom-right': { cx: 400, cy: 300, startAngle: 180, sweep: 90  },
  'top':          { cx: 200, cy: 0,   startAngle: 20,  sweep: 140 },
  'right':        { cx: 400, cy: 150, startAngle: 110, sweep: 140 },
};

/**
 * Compute a web path from a given anchor.
 * Radial lines fan out; arcs connect them with slight natural deviation.
 */
function buildWebPaths(anchor, color) {
  const { cx, cy, startAngle, sweep } = ANCHORS[anchor] || ANCHORS['top-left'];
  const threadCount  = 9;
  const ringCount    = 6;
  const maxRadius    = 360;

  // Radial thread angles
  const angles = Array.from({ length: threadCount }, (_, i) => {
    const base = startAngle + (i / (threadCount - 1)) * sweep;
    // slight random wobble for organic feel
    const wobble = (((cx + cy + i * 37) % 7) - 3) * 0.8;
    return ((base + wobble) * Math.PI) / 180;
  });

  const elements = [];

  // ── RADIAL THREADS ──────────────────────────────────────
  angles.forEach((rad, i) => {
    const len = maxRadius * (0.75 + (((cx * i + cy) % 5) * 0.05));
    const x2  = cx + len * Math.cos(rad);
    const y2  = cy + len * Math.sin(rad);
    elements.push(
      <line
        key={`thread-${i}`}
        x1={cx} y1={cy} x2={x2} y2={y2}
        stroke={color}
        strokeWidth={i % 3 === 0 ? 0.9 : 0.6}
        strokeLinecap="round"
      />
    );
  });

  // ── CONCENTRIC RINGS (organic cubic bezier arcs) ─────────
  const ringRadii = Array.from({ length: ringCount }, (_, i) =>
    (maxRadius / (ringCount + 1)) * (i + 1)
  );

  ringRadii.forEach((r, ri) => {
    // Connect each pair of adjacent radial threads with a natural curve
    for (let i = 0; i < angles.length - 1; i++) {
      const a1 = angles[i];
      const a2 = angles[i + 1];

      // slight radius variation per ring segment for organic feel
      const rv = r * (1 + (((ri * 7 + i * 13) % 9) - 4) * 0.015);

      const x1 = cx + rv * Math.cos(a1);
      const y1 = cy + rv * Math.sin(a1);
      const x2 = cx + rv * Math.cos(a2);
      const y2 = cy + rv * Math.sin(a2);

      // Mid-angle control point slightly inside/outside for natural droop
      const midAngle = (a1 + a2) / 2;
      const droop    = rv * (1 - 0.08 - (ri % 2) * 0.04);
      const cpx = cx + droop * Math.cos(midAngle);
      const cpy = cy + droop * Math.sin(midAngle);

      // Occasionally add a slack sag for realism
      const sag = ri % 3 === 1 ? rv * 0.04 : 0;

      elements.push(
        <path
          key={`ring-${ri}-${i}`}
          d={`M ${x1} ${y1} Q ${cpx} ${cpy + sag} ${x2} ${y2}`}
          fill="none"
          stroke={color}
          strokeWidth={0.55 + ri * 0.05}
          strokeLinecap="round"
        />
      );
    }
  });

  // ── ANCHOR DOT ───────────────────────────────────────────
  elements.push(
    <circle key="anchor" cx={cx} cy={cy} r={2.2} fill={color} />
  );

  return elements;
}

export default function WebSVG({ anchor = 'top-left', opacity = 1 }) {
  // Use CSS variable for stroke so it respects theme
  const color = 'var(--web-stroke)';

  return (
    <svg
      className="web-svg"
      viewBox="0 0 400 300"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ opacity }}
    >
      <g>{buildWebPaths(anchor, color)}</g>
    </svg>
  );
}
