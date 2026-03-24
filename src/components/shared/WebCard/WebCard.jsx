import { useRef, useCallback } from 'react';
import WebSVG from '../WebSVG/WebSVG';
import './WebCard.css';

/**
 * WebCard — card with spider-web hover effect.
 *
 * Extra prop:
 *  suppressHover — when true, disables the lift/glow/web hover effects
 *                  (used by skill cards during a thwip animation)
 */
export default function WebCard({
  children,
  className = '',
  style = {},
  webAnchor = 'top-left',
  webOpacity = 1,
  subtle = false,
  suppressHover = false,
  as: Tag = 'div',
  href,
  target,
  rel,
}) {
  const ref = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width * 100).toFixed(1)}%`);
    ref.current.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height * 100).toFixed(1)}%`);
  }, []);

  const classes = [
    'web-card',
    subtle        ? 'web-card--subtle'         : '',
    suppressHover ? 'web-card--suppress-hover' : '',
    className,
  ].filter(Boolean).join(' ');

  const props = {
    ref,
    className: classes,
    style,
    onMouseMove: handleMouseMove,
    ...(href ? { href, target, rel } : {}),
  };

  return (
    <Tag {...props}>
      <span className="web-card__glow"    aria-hidden="true" />
      <span className="web-card__web"     aria-hidden="true">
        <WebSVG anchor={webAnchor} opacity={webOpacity} />
      </span>
      <div className="web-card__content">
        {children}
      </div>
    </Tag>
  );
}