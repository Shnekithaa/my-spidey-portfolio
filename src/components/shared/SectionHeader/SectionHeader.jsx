import './SectionHeader.css';

export default function SectionHeader({ num, label, title }) {
  return (
    <header className="section-header">
      <p className="section-header__label font-mono">
        <span className="section-header__num">{num}</span>
        {label}
      </p>
      <h2 className="section-header__title font-display">{title}</h2>
    </header>
  );
}
