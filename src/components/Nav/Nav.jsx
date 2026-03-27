import { forwardRef, useEffect, useState } from 'react';
import './Nav.css';

const NAV_LINKS   = ['About', 'Skills', 'Experience', 'Projects', 'Contact'];
const SECTION_IDS = NAV_LINKS.map(l => l.toLowerCase());

const Nav = forwardRef(function Nav(
  { theme, onToggleTheme, spidersEnabled, onToggleSpiders },
  toggleRef
) {
  const [menuOpen, setMenuOpen] = useState(false);

  const [activeSection, setActiveSection] = useState(SECTION_IDS[0]);

  // Returns the correct nav height for the current viewport
  const navH = () => (window.innerWidth <= 768 ? 54 : 62);

  useEffect(() => {
    const sections = SECTION_IDS
      .map(id => document.getElementById(id))
      .filter(Boolean);
    if (!sections.length) return;

    let ticking = false;
    const sync = () => {
      const marker = window.scrollY + navH() + 100;
      let current = SECTION_IDS[0];
      for (const s of sections) { if (s.offsetTop <= marker) current = s.id; }
      setActiveSection(prev => {
  if (prev === current) return prev;
  window.history.replaceState(null, '', `#${current}`);
  return current;
});
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
    const top = node.getBoundingClientRect().top + window.scrollY - navH();
    window.scrollTo({ top, behavior: 'smooth' });
  };

  // Close sheet when viewport goes desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) setMenuOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Close on outside tap
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      const target = e.target;
      if (!(target instanceof Element) || !target.closest('.nav')) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('touchstart', close, { passive: true });
    document.addEventListener('mousedown', close);
    return () => {
      document.removeEventListener('touchstart', close);
      document.removeEventListener('mousedown', close);
    };
  }, [menuOpen]);

  const handleNavClick = (id) => {
    setActiveSection(id);
    setMenuOpen(false);
    // Wait for sheet close animation then scroll
    setTimeout(() => scrollToSection(id), 80);
  };

  const handleLinkActivate = (e, id) => {
    e.preventDefault();
    handleNavClick(id);
  };

  const handleMobileSpidersToggle = () => {
    onToggleSpiders();
    setMenuOpen(false);
  };

  const handleMobileThemeToggle = () => {
    onToggleTheme();
    setMenuOpen(false);
  };

  return (
    <nav className="nav" role="navigation" aria-label="Main navigation">
      <span className="nav__logo font-display" aria-label="Balashnekithaa">SHN·EKI</span>

      {/* Hamburger */}
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

      {/* Desktop links */}
      <ul className="nav__links" role="list">
        {NAV_LINKS.map(link => (
          <li key={link}>
            <a
              href={`#${link.toLowerCase()}`}
              className={`nav__link font-mono${activeSection === link.toLowerCase() ? ' nav__link--active' : ''}`}
              aria-current={activeSection === link.toLowerCase() ? 'page' : undefined}
              onClick={(e) => handleLinkActivate(e, link.toLowerCase())}
            >
              {link}
            </a>
          </li>
        ))}
      </ul>

      {/* Desktop controls */}
      <div className="nav__controls">
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

        <button
          ref={toggleRef}
          className="nav__toggle font-mono"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'Venom dark' : 'Spidey light'} mode`}
        >
          {theme === 'light' ? '🕸 VENOM' : '🕷 SPIDEY'}
        </button>
      </div>

      {/* Mobile sheet */}
      <div className={`nav__mobile-sheet${menuOpen ? ' nav__mobile-sheet--open' : ''}`}>
        <ul className="nav__mobile-links" role="list">
          {NAV_LINKS.map(link => (
            <li key={`m-${link}`}>
              <a
                href={`#${link.toLowerCase()}`}
                className={`nav__mobile-link font-mono${activeSection === link.toLowerCase() ? ' nav__mobile-link--active' : ''}`}
                onClick={(e) => handleLinkActivate(e, link.toLowerCase())}
                onTouchEnd={(e) => handleLinkActivate(e, link.toLowerCase())}
              >
                {link}
              </a>
            </li>
          ))}
        </ul>

        <div className="nav__mobile-controls">
          <button
            className={`nav__spider-toggle${spidersEnabled ? ' nav__spider-toggle--on' : ''}`}
            onClick={handleMobileSpidersToggle}
            aria-label={spidersEnabled ? 'Disinfect' : 'Infect with spiders'}
            aria-pressed={spidersEnabled}
          >
            <span className="nav__spider-toggle-icon">🕷</span>
            <span className="nav__spider-toggle-label font-mono">
              {spidersEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* No ref here — avoids duplicate forwardRef React warning */}
          <button
            className="nav__toggle font-mono"
            onClick={handleMobileThemeToggle}
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