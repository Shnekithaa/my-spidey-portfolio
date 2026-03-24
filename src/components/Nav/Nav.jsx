import { forwardRef, useEffect, useState } from 'react';
import './Nav.css';

const NAV_LINKS   = ['About', 'Skills', 'Experience', 'Projects', 'Contact'];
const SECTION_IDS = NAV_LINKS.map(l => l.toLowerCase());
const NAV_HEIGHT  = 64;

const Nav = forwardRef(function Nav(
  { theme, onToggleTheme, spidersEnabled, onToggleSpiders },
  toggleRef
) {
  const [menuOpen, setMenuOpen] = useState(false);

  const [activeSection, setActiveSection] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return SECTION_IDS.includes(hash) ? hash : SECTION_IDS[0];
  });

  useEffect(() => {
    const sections = SECTION_IDS
      .map(id => document.getElementById(id))
      .filter(Boolean);
    if (!sections.length) return;

    let ticking = false;
    const sync = () => {
      const marker = window.scrollY + NAV_HEIGHT + 120;
      let current = SECTION_IDS[0];
      for (const s of sections) { if (s.offsetTop <= marker) current = s.id; }
      setActiveSection(prev => prev === current ? prev : current);
      const next = `#${current}`;
      if (window.location.hash !== next) window.history.replaceState(null, '', next);
    };
    const onEvent = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { sync(); ticking = false; });
    };
    window.addEventListener('scroll', onEvent, { passive: true });
    window.addEventListener('resize', onEvent);
    sync();
    return () => {
      window.removeEventListener('scroll', onEvent);
      window.removeEventListener('resize', onEvent);
    };
  }, []);

  const scrollToSection = (id) => {
    const node = document.getElementById(id);
    if (!node) return;
    const top = node.getBoundingClientRect().top + window.scrollY - (NAV_HEIGHT - 2);
    window.scrollTo({ top, behavior: 'smooth' });
    window.history.replaceState(null, '', `#${id}`);
  };

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleNavClick = (id) => {
    setActiveSection(id);
    setMenuOpen(false);
    scrollToSection(id);
  };

  return (
    <nav className="nav" role="navigation" aria-label="Main navigation">
      <span className="nav__logo font-display" aria-label="Balashnekithaa">SHN·EKI</span>

      <button
        className={`nav__menu-btn${menuOpen ? ' nav__menu-btn--open' : ''}`}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(prev => !prev)}
      >
        <span className="nav__menu-line" />
        <span className="nav__menu-line" />
        <span className="nav__menu-line" />
      </button>

      <ul className="nav__links" role="list">
        {NAV_LINKS.map(link => (
          <li key={link}>
            <a
              href={`#${link.toLowerCase()}`}
              className={`nav__link font-mono${activeSection === link.toLowerCase() ? ' nav__link--active' : ''}`}
              aria-current={activeSection === link.toLowerCase() ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(link.toLowerCase());
              }}
            >
              {link}
            </a>
          </li>
        ))}
      </ul>

      <div className="nav__controls">
        {/* Spider toggle */}
        <button
          className={`nav__spider-toggle${spidersEnabled ? ' nav__spider-toggle--on' : ''}`}
          onClick={onToggleSpiders}
          aria-label={spidersEnabled ? 'Disinfect' : 'Infect with spiders'}
          aria-pressed={spidersEnabled}
          data-tooltip={spidersEnabled ? 'Disinfect' : 'Infect with spiders'}
          data-hover
        >
          <span className="nav__spider-toggle-icon">🕷</span>
          <span className="nav__spider-toggle-label font-mono">
            {spidersEnabled ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Theme toggle */}
        <button
          ref={toggleRef}
          className="nav__toggle font-mono"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'Venom dark' : 'Spidey light'} mode`}
        >
          {theme === 'light' ? '🕸 VENOM' : '🕷 SPIDEY'}
        </button>
      </div>

      <div className={`nav__mobile-sheet${menuOpen ? ' nav__mobile-sheet--open' : ''}`}>
        <ul className="nav__mobile-links" role="list">
          {NAV_LINKS.map(link => (
            <li key={`m-${link}`}>
              <a
                href={`#${link.toLowerCase()}`}
                className={`nav__mobile-link font-mono${activeSection === link.toLowerCase() ? ' nav__mobile-link--active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.toLowerCase());
                }}
              >
                {link}
              </a>
            </li>
          ))}
        </ul>

        <div className="nav__mobile-controls">
          <button
            className={`nav__spider-toggle${spidersEnabled ? ' nav__spider-toggle--on' : ''}`}
            onClick={onToggleSpiders}
            aria-label={spidersEnabled ? 'Disinfect' : 'Infect with spiders'}
            aria-pressed={spidersEnabled}
            data-tooltip={spidersEnabled ? 'Disinfect' : 'Infect with spiders'}
          >
            <span className="nav__spider-toggle-icon">🕷</span>
            <span className="nav__spider-toggle-label font-mono">
              {spidersEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            ref={toggleRef}
            className="nav__toggle font-mono"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'Venom dark' : 'Spidey light'} mode`}
          >
            {theme === 'light' ? '🕸 VENOM' : '🕷 SPIDEY'}
          </button>
        </div>
      </div>
    </nav>
  );
});

export default Nav;