import { personal, education, stats, achievements } from '../../data/portfolio';
import WebCard from '../shared/WebCard/WebCard';
import SectionHeader from '../shared/SectionHeader/SectionHeader';
import './About.css';

function StatBox({ num, label, index }) {
  const anchors = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  return (
    <WebCard className="about__stat" webAnchor={anchors[index % 4]}>
      <span className="about__stat-num font-display">{num}</span>
      <span className="about__stat-label font-mono">{label}</span>
    </WebCard>
  );
}

function AchievementCard({ icon, title, sub, desc, index }) {
  return (
    <WebCard
      className="about__achievement"
      webAnchor={index % 2 === 0 ? 'top-left' : 'top-right'}
    >
      <span className="about__ach-icon" aria-hidden="true">{icon}</span>
      <h4 className="about__ach-title font-display">{title}</h4>
      <p className="about__ach-sub">{sub}</p>
      <p className="about__ach-desc">{desc}</p>
    </WebCard>
  );
}

export default function About() {
  return (
    <section id="about" className="about section-base" aria-label="About me">
      <SectionHeader num="01" label="Who Am I" title="ABOUT ME" />

      <div className="about__grid">
        {/* ── LEFT: Bio + Stats ── */}
        <div className="about__left">
          <div className="about__bio">
            {personal.bio.map((para, i) => (
              <p key={i} className="about__bio-para">{para}</p>
            ))}
          </div>

          <div className="about__stats">
            {stats.map((s, i) => (
              <StatBox key={s.label} {...s} index={i} />
            ))}
          </div>
        </div>

        {/* ── RIGHT: Education + Achievements ── */}
        <div className="about__right">
          <WebCard className="about__edu" webAnchor="top-right">
            <span className="about__edu-tag font-mono">Education · {education.years}</span>
            <h3 className="about__edu-degree font-display">{education.degree.toUpperCase()}</h3>
            <p className="about__edu-school">{education.program}</p>
            <p className="about__edu-detail">{education.enrollment} · {education.campus}</p>
          </WebCard>

          <div className="about__achievements-header font-mono">Achievements</div>
          <div className="about__achievements">
            {achievements.map((a, i) => (
              <AchievementCard key={a.title} {...a} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
