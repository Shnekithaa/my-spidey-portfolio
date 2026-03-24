import { useRef, useCallback } from 'react';

/**
 * Returns a ref to attach to a container and a mousemove handler
 * that tracks cursor position as CSS custom properties (--mx, --my).
 */
export function useMousePosition() {
  const ref = useRef(null);

  const onMouseMove = useCallback((e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    ref.current.style.setProperty('--mx', `${x.toFixed(1)}%`);
    ref.current.style.setProperty('--my', `${y.toFixed(1)}%`);
  }, []);

  return { ref, onMouseMove };
}
