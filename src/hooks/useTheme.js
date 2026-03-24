import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('portfolio-theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('portfolio-theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  return { theme, toggle };
}
