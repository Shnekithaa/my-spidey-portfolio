import { useRef, useCallback, useEffect, useState } from 'react';
import { useTheme }       from './hooks/useTheme';
import Nav                from './components/Nav/Nav';
import Hero               from './components/Hero/Hero';
import About              from './components/About/About';
import Skills             from './components/Skills/Skills';
import Experience         from './components/Experience/Experience';
import Projects           from './components/Projects/Projects';
import Contact            from './components/Contact/Contact';
import Footer             from './components/Footer/Footer';
import Cursor             from './components/shared/Cursor/Cursor';
import VenomTransition    from './components/shared/VenomTransition/VenomTransition';
import WebGrid            from './components/shared/WebGrid/WebGrid';
import ScrollCrawler      from './components/shared/ScrollCrawler/ScrollCrawler';
import SpiderWorld        from './components/shared/SpiderWorld/SpiderWorld';
import SpideyBot          from './components/shared/SpideyBot/SpideyBot';
import './styles/globals.css';
import './App.css';

export default function App() {
  const { theme, toggle }   = useTheme();
  const toggleRef           = useRef(null);
  const venomRef            = useRef(null);
  const [spidersOn, setSpidersOn] = useState(() =>
    localStorage.getItem('spiders-enabled') !== 'false'
  );

  const handleToggle = useCallback(() => {
    if (venomRef.current) venomRef.current.trigger(toggle);
    else toggle();
  }, [toggle]);

  const handleToggleSpiders = useCallback(() => {
    setSpidersOn(prev => {
      const next = !prev;
      localStorage.setItem('spiders-enabled', String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    // Prevent hash persistence from restoring a deep section on reload.
    const cleanUrl = `${window.location.pathname}${window.location.search}`;
    if (window.location.hash) {
      window.history.replaceState(null, '', cleanUrl);
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <>
      <WebGrid theme={theme} />
      <SpiderWorld enabled={spidersOn} />
      <Cursor />
      <VenomTransition ref={venomRef} theme={theme} originRef={toggleRef} />
      <Nav
        ref={toggleRef}
        theme={theme}
        onToggleTheme={handleToggle}
        spidersEnabled={spidersOn}
        onToggleSpiders={handleToggleSpiders}
      />
      <SpideyBot theme={theme} />
      <ScrollCrawler />
      <main id="main-content" className="main-content">
        <Hero />
        <About />
        <Skills />
        <Experience />
        <Projects />
        <Contact theme={theme} />
      </main>
      <Footer theme={theme} />
    </>
  );
}