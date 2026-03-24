import { experience } from '../../data/portfolio';
import WebCard from '../shared/WebCard/WebCard';
import SectionHeader from '../shared/SectionHeader/SectionHeader';
import './Experience.css';

function TechPill({ label }) {
  return <span className="exp__tech-pill font-mono">{label}</span>;
}

function ExperienceCard({ role, company, type, period, bullets, tech }) {
  return (
    /*
     * subtle=true keeps the web effect very faint (opacity 0.22 on hover)
     * so the dense bullet text remains fully legible.
     * The glow is also reduced to 50% via the subtle variant CSS.
     */
    <WebCard className="exp__card" webAnchor="bottom-right" subtle>
      {/* Header */}
      <div className="exp__header">
        <div className="exp__header-left">
          <h3 className="exp__role font-display">{role.toUpperCase()}</h3>
          <p className="exp__company">
            {company}
            <span className="exp__type font-mono">{type}</span>
          </p>
        </div>
        <span className="exp__period font-mono">{period}</span>
      </div>

      {/* Tech stack */}
      <div className="exp__tech">
        {tech.map((t) => <TechPill key={t} label={t} />)}
      </div>

      {/* Bullet points */}
      <ul className="exp__bullets" role="list">
        {bullets.map((b, i) => (
          <li key={i} className="exp__bullet">
            <span className="exp__bullet-marker" aria-hidden="true">◈</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </WebCard>
  );
}

export default function Experience() {
  return (
    <section id="experience" className="experience section-base" aria-label="Work experience">
      <SectionHeader num="03" label="Where I've Worked" title="EXPERIENCE" />

      <div className="experience__list">
        {experience.map((exp) => (
          <ExperienceCard key={`${exp.company}-${exp.period}`} {...exp} />
        ))}
      </div>
    </section>
  );
}
