import { useEffect, useRef, useState } from 'react';
import './ScrollCrawler.css';

/**
 * ScrollCrawler
 *
 * A tiny Spidey silhouette that crawls down a vertical web-strand
 * fixed to the right edge of the viewport, tracking page scroll progress.
 * Disappears once the user scrolls past the hero section.
 */
export default function ScrollCrawler() {
  const [progress, setProgress]   = useState(0);  // 0..1
  const [visible,  setVisible]    = useState(true);
  const rafRef = useRef(null);

  useEffect(() => {
    const update = () => {
      const scrollY = window.scrollY;
      const total   = document.documentElement.scrollHeight - window.innerHeight;
      const p       = total > 0 ? Math.min(scrollY / total, 1) : 0;
      setProgress(p);

      // Hide after 80% scrolled — user clearly explored everything
      setVisible(p < 0.88);
    };

    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, []);

  // Track height of component
  const TRACK_HEIGHT = 160; // px — length of the visible strand

  return (
    <div
      className={`scroll-crawler ${!visible ? 'scroll-crawler--hidden' : ''}`}
      aria-hidden="true"
    >
      {/* Vertical strand */}
      <div className="scroll-crawler__track">
        {/* Web node dots along strand */}
        {[0.15, 0.35, 0.55, 0.75, 0.95].map((pos) => (
          <span
            key={pos}
            className="scroll-crawler__node"
            style={{ top: `${pos * 100}%` }}
          />
        ))}

        {/* Spider icon crawling along the strand */}
        <span
          className="scroll-crawler__spider"
          style={{ top: `${progress * 100}%` }}
        >
          🕷
        </span>
      </div>

      {/* Label at bottom */}
      <span className="scroll-crawler__label font-mono">scroll</span>
    </div>
  );
}