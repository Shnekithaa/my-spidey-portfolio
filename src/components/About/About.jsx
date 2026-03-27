import { useRef, useState } from 'react';
import { personal, education, stats, achievements } from '../../data/portfolio';
import WebCard from '../shared/WebCard/WebCard';
import SectionHeader from '../shared/SectionHeader/SectionHeader';
import './About.css';

function StatBox({ num, label, index, onShoot, isShotActive }) {
  const anchors = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  return (
    <WebCard
      className={`about__stat about__webshot-target${isShotActive ? ' about__webshot-target--active' : ''}`}
      webAnchor={anchors[index % 4]}
      onPointerDown={onShoot}
      data-hover
    >
      <span className="about__stat-num font-display">{num}</span>
      <span className="about__stat-label font-mono">{label}</span>
    </WebCard>
  );
}

function AchievementCard({ icon, title, sub, desc, index, onShoot, isShotActive }) {
  return (
    <WebCard
      className={`about__achievement about__webshot-target${isShotActive ? ' about__webshot-target--active' : ''}`}
      webAnchor={index % 2 === 0 ? 'top-left' : 'top-right'}
      onPointerDown={onShoot}
      data-hover
    >
      <span className="about__ach-icon" aria-hidden="true">{icon}</span>
      <h4 className="about__ach-title font-display">{title}</h4>
      <p className="about__ach-sub">{sub}</p>
      <p className="about__ach-desc">{desc}</p>
    </WebCard>
  );
}

export default function About() {
  const [activeShot, setActiveShot] = useState('');
  const shotTimer = useRef(null);

  const makeShootHandler = (key) => (e) => {
    if (window.innerWidth > 900) return;
    if (e.pointerType === 'mouse') return;
    setActiveShot(key);
    window.clearTimeout(shotTimer.current);
    shotTimer.current = window.setTimeout(() => setActiveShot(''), 460);
  };

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
              <StatBox
                key={s.label}
                {...s}
                index={i}
                onShoot={makeShootHandler(`stat-${s.label}`)}
                isShotActive={activeShot === `stat-${s.label}`}
              />
            ))}
          </div>
        </div>

        {/* ── RIGHT: Education + Achievements ── */}
        <div className="about__right">
          <WebCard
            className={`about__edu about__webshot-target${activeShot === 'edu' ? ' about__webshot-target--active' : ''}`}
            webAnchor="top-right"
            onPointerDown={makeShootHandler('edu')}
            data-hover
          >
            <span className="about__edu-tag font-mono">Education · {education.years}</span>
            <h3 className="about__edu-degree font-display">{education.degree.toUpperCase()}</h3>
            <p className="about__edu-school">{education.program}</p>
            <p className="about__edu-detail">{education.enrollment} · {education.campus}</p>
          </WebCard>

          <div className="about__achievements-header font-mono">Achievements</div>
          <div className="about__achievements">
            {achievements.map((a, i) => (
              <AchievementCard
                key={a.title}
                {...a}
                index={i}
                onShoot={makeShootHandler(`ach-${a.title}`)}
                isShotActive={activeShot === `ach-${a.title}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
