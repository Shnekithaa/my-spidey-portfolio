import './Footer.css';

export default function Footer({ theme }) {
  return (
    <footer className="footer" role="contentinfo">
      <span className="footer__left font-mono">
        © 2026 · Balashnekithaa S · Built with 🕸
      </span>
      <span className="footer__logo font-display">SHN·EKI</span>
      <span className="footer__mode font-mono">
        {theme === 'light' ? 'SPIDEY MODE 🕷' : 'VENOM MODE 🕸'}
      </span>
    </footer>
  );
}
