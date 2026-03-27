import { useState, useCallback, useRef, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import { contactLinks } from '../../data/portfolio';
import WebCard from '../shared/WebCard/WebCard';
import SectionHeader from '../shared/SectionHeader/SectionHeader';
import './Contact.css';

/* ─────────────────────────────────────────────────────────────────────
   EmailJS config — replace these with your actual IDs from emailjs.com
   1. Sign up at https://emailjs.com
   2. Create a service (Gmail) → copy Service ID
   3. Create a template with variables: {{from_name}}, {{from_email}},
      {{subject}}, {{message}} → copy Template ID
   4. Copy your Public Key from Account > API Keys
────────────────────────────────────────────────────────────────────── */
const EMAILJS_SERVICE_ID  = 'service_dpfgwv5';
const EMAILJS_TEMPLATE_ID = 'template_5932oam';
const EMAILJS_PUBLIC_KEY  = 'wEL8XNI5wiAbqoqID';

const ANCHORS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

/* ── Spider-Signal SVG ─────────────────────────────────────────────── */
function SpiderSignal({ active, theme }) {
  const isDark   = theme === 'dark';
  const rayColor = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(220,180,0,0.95)';

  const rays = Array.from({ length: 8 }, (_, i) => {
    const baseAngle = (i / 8) * 360;
    const rad       = (baseAngle * Math.PI) / 180;
    const jagAngle  = rad + 0.18;
    const outerR    = active ? 115 : 94;
    return {
      ix: 100 + Math.cos(rad)      * 58,
      iy: 100 + Math.sin(rad)      * 58,
      mx: 100 + Math.cos(jagAngle) * 78,
      my: 100 + Math.sin(jagAngle) * 78,
      ox: 100 + Math.cos(rad)      * outerR,
      oy: 100 + Math.sin(rad)      * outerR,
    };
  });

  const tendrils = isDark ? Array.from({ length: 12 }, (_, i) => {
    const angle  = (i / 12) * Math.PI * 2;
    const spread = active ? 90 : 55;
    return {
      cp1x: 100 + Math.cos(angle + 0.4) * spread * 0.5,
      cp1y: 100 + Math.sin(angle + 0.4) * spread * 0.5,
      cp2x: 100 + Math.cos(angle - 0.3) * spread * 0.8,
      cp2y: 100 + Math.sin(angle - 0.3) * spread * 0.8,
      ex:   100 + Math.cos(angle) * spread,
      ey:   100 + Math.sin(angle) * spread,
    };
  }) : [];

  return (
    <svg viewBox="0 0 200 200"
      className={`signal__svg${active ? ' signal__svg--active' : ''}`}
      aria-hidden="true">
      <defs>
        <filter id="signalGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={active ? '4' : '2'} result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="tendrilGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={isDark ? '#ffffff' : '#ffd700'}
            stopOpacity={active ? '0.5' : '0.3'} />
          <stop offset="100%" stopColor={isDark ? '#aaffaa' : '#ff8800'} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="100" cy="100" r={active ? 60 : 45} fill="url(#coreGrad)"
        style={{ transition: 'r 0.4s ease' }} />

      {isDark && tendrils.map((t, i) => (
        <path key={i}
          d={`M 100 100 C ${t.cp1x} ${t.cp1y} ${t.cp2x} ${t.cp2y} ${t.ex} ${t.ey}`}
          stroke="rgba(255,255,255,0.55)" strokeWidth={active ? 1.8 : 1}
          fill="none" strokeLinecap="round" filter="url(#tendrilGlow)"
          style={{ transition: `stroke-width 0.3s ease, opacity 0.3s ease ${i * 0.03}s`,
            opacity: active ? 0.7 : 0.25 }} />
      ))}

      {rays.map((r, i) => (
        <polyline key={i}
          points={`${r.ix},${r.iy} ${r.mx},${r.my} ${r.ox},${r.oy}`}
          stroke={rayColor} strokeWidth={active ? 3 : 2}
          fill="none" strokeLinecap="round" strokeLinejoin="round"
          filter="url(#signalGlow)"
          style={{ transition: `all 0.35s cubic-bezier(0.34,1.4,0.64,1) ${i * 0.04}s`,
            opacity: active ? 1 : 0.65 }} />
      ))}

      <circle cx="100" cy="100" r="18"
        fill={isDark ? '#0a0a0f' : '#1a0a0a'}
        stroke={isDark ? 'rgba(255,255,255,0.8)' : 'rgba(220,180,0,0.9)'}
        strokeWidth="2" filter="url(#signalGlow)" />
      <text x="100" y="107" textAnchor="middle" fontSize="18"
        fill={isDark ? 'rgba(255,255,255,0.9)' : 'rgba(220,180,0,0.95)'}
        style={{ userSelect: 'none' }}>🕷</text>

      {[30, 44].map((r, i) => (
        <circle key={i} cx="100" cy="100" r={r} fill="none"
          stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(220,180,0,0.15)'}
          strokeWidth="1" strokeDasharray="4 6"
          style={{ transformOrigin: '100px 100px',
            animation: active ? `spinRing ${3 + i}s linear infinite` : 'none' }} />
      ))}
    </svg>
  );
}

/* ── Contact link card ─────────────────────────────────────────────── */
function ContactLink({ icon, label, value, href, index, visible }) {
  return (
    <WebCard as="a" href={href} target="_blank" rel="noreferrer"
      className={`contact__link${visible ? ' contact__link--visible' : ''}`}
      webAnchor={ANCHORS[index % ANCHORS.length]}
      style={{ transitionDelay: visible ? `${index * 0.09}s` : '0s' }}
      aria-label={`${label}: ${value}`}>
      <span className="contact__link-icon" aria-hidden="true">{icon}</span>
      <div className="contact__link-body">
        <span className="contact__link-label font-mono">{label}</span>
        <span className="contact__link-value">{value}</span>
      </div>
      <span className="contact__link-arrow" aria-hidden="true">→</span>
    </WebCard>
  );
}

/* ── Terminal Mailer ───────────────────────────────────────────────── */
// Steps: 0=name, 1=email, 2=subject, 3=message, 4=confirm, 5=sent
const PROMPTS = [
  { key: 'name',    question: "what's your name?",          placeholder: 'e.g. Peter Parker'       },
  { key: 'email',   question: 'your email address?',        placeholder: 'e.g. peter@daily.com'    },
  { key: 'subject', question: 'subject / reason?',          placeholder: 'e.g. Collaboration idea' },
  { key: 'message', question: "your message to shnekithaa?", placeholder: 'type your message...'   },
];

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function Terminal({ theme, visible }) {
  const isDark   = theme === 'dark';
  const [step, setStep]       = useState(0);
  const [values, setValues]   = useState({ name: '', email: '', subject: '', message: '' });
  const [current, setCurrent] = useState('');
  const [history, setHistory] = useState([]);
  const [sending, setSending] = useState(false);
  const [swinging, setSwinging] = useState(false);
  const inputRef   = useRef(null);
  const bottomRef  = useRef(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (visible && (step < PROMPTS.length || step === 4))
      inputRef.current?.focus();
  }, [visible, step]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const addLine = useCallback((text, type = 'normal') => {
    // type: 'normal' | 'cmd' | 'success' | 'error' | 'sys' | 'dim'
    setHistory(h => [...h, { text, type }]);
  }, []);

  // Init
  useEffect(() => {
    if (visible && !initialised.current) {
      initialised.current = true;
      setTimeout(() => addLine(PROMPTS[0].question), 350);
    }
  }, [visible, addLine]);

  /* ── Step input handler ── */
  const handleStepKey = useCallback((e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = current.trim();

    // Validate email step
    if (step === 1 && val && !validateEmail(val)) {
      addLine(`> ${val}`, 'cmd');
      setCurrent('');
      addLine('✘ invalid email address — try again', 'error');
      return;
    }

    if (!val) return;

    addLine(`> ${val}`, 'cmd');
    const newValues = { ...values, [PROMPTS[step].key]: val };
    setValues(newValues);
    setCurrent('');

    if (step < PROMPTS.length - 1) {
      setTimeout(() => {
        addLine(PROMPTS[step + 1].question);
        setStep(s => s + 1);
      }, 180);
    } else {
      // All filled — show summary
      setTimeout(() => {
        addLine('─────────────────────────────', 'dim');
        addLine(`from    : ${newValues.name} <${newValues.email}>`, 'dim');
        addLine(`subject : ${newValues.subject}`, 'dim');
        addLine(`message : ${newValues.message}`, 'dim');
        addLine('─────────────────────────────', 'dim');
        addLine('press ENTER to send  ·  type "edit" to restart', 'normal');
        setStep(4);
      }, 180);
    }
  }, [current, step, values, addLine]);

  /* ── Confirm handler ── */
  const handleConfirmKey = useCallback(async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = current.trim().toLowerCase();
    setCurrent('');

    if (val === 'edit' || val === 'reset') {
      setStep(0);
      setValues({ name: '', email: '', subject: '', message: '' });
      setHistory([]);
      setTimeout(() => addLine(PROMPTS[0].question), 100);
      return;
    }

    addLine('> [ENTER]', 'cmd');
    setSending(true);
    addLine('◌ sending...', 'dim');

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name:  values.name,
          from_email: values.email,
          subject:    values.subject,
          message:    values.message,
          to_name:    'Shnekithaa',
        },
        EMAILJS_PUBLIC_KEY
      );

      addLine('✦ THWIP! message sent successfully 🕷', 'success');
      addLine(`✦ shnekithaa will get back to you at ${values.email}`, 'success');
      setStep(5);
      setSwinging(true);
      setTimeout(() => setSwinging(false), 2800);
    } catch (err) {
      const msg = err?.text || err?.message || 'unknown error';
      addLine(`✘ send failed: ${msg}`, 'error');
      addLine('type "retry" to try again  ·  "edit" to change details', 'normal');
      setStep(4); // back to confirm so they can retry
    } finally {
      setSending(false);
    }
  }, [current, values, addLine]);

  /* ── Retry from error ── */
  const handleRetry = useCallback(async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = current.trim().toLowerCase();
    setCurrent('');

    if (val === 'edit' || val === 'reset') {
      setStep(0);
      setValues({ name: '', email: '', subject: '', message: '' });
      setHistory([]);
      setTimeout(() => addLine(PROMPTS[0].question), 100);
      return;
    }
    // treat any enter as retry
    addLine('> retry', 'cmd');
    await handleConfirmKey({ key: 'Enter', preventDefault: () => {} });
  }, [current, handleConfirmKey, addLine]);

  const isDone = step === 5;
  const activeHandler = step < PROMPTS.length
    ? handleStepKey
    : handleConfirmKey;

  return (
    <div className={`terminal${isDark ? ' terminal--dark' : ' terminal--light'}${visible ? ' terminal--visible' : ''}`}>
      <div className="terminal__bar">
        <span className="terminal__dot terminal__dot--r" />
        <span className="terminal__dot terminal__dot--y" />
        <span className="terminal__dot terminal__dot--g" />
        <span className="terminal__title font-mono">spidey-mail — bash</span>
      </div>

      <div className="terminal__output" onClick={() => inputRef.current?.focus()}>
        <p className="terminal__line terminal__line--sys font-mono">
          // spidey-mail v1.0 — direct line to shnekithaa
        </p>

        {history.map((h, i) => (
          <p key={i} className={`terminal__line terminal__line--${h.type} font-mono`}>
            {h.text}
          </p>
        ))}

        {!isDone && !sending && (
          <div className="terminal__input-row">
            <span className="terminal__prompt font-mono">❯</span>
            <input ref={inputRef}
              className="terminal__input font-mono"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              onKeyDown={activeHandler}
              placeholder={step < PROMPTS.length
                ? PROMPTS[step].placeholder
                : 'press enter to send...'}
              autoComplete="off"
              spellCheck="false"
              disabled={sending}
              aria-label={step < PROMPTS.length ? PROMPTS[step].question : 'confirm send'}
            />
          </div>
        )}

        {sending && (
          <div className="terminal__spinner font-mono">
            <span className="terminal__dot-anim" />
            sending...
          </div>
        )}

        {isDone && (
          <button className="terminal__reset font-mono"
            onClick={() => {
              setStep(0);
              setValues({ name:'', email:'', subject:'', message:'' });
              setCurrent('');
              setHistory([]);
              initialised.current = false;
              setTimeout(() => addLine(PROMPTS[0].question), 100);
            }}>
            ↺ send another message
          </button>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Swinging spider bar */}
      <div className="terminal__swing-track" aria-hidden="true">
        <span className={`terminal__swing${swinging ? ' terminal__swing--go' : ''}`}>
          🕷
        </span>
      </div>
    </div>
  );
}

/* ── Contact section ───────────────────────────────────────────────── */
export default function Contact({ theme }) {
  const [active, setActive]   = useState(false);
  const [tab, setTab]         = useState('connect');
  const [ready, setReady]     = useState(false); // delays panel render until after signal moves
  const [buzzing, setBuzzing] = useState(false);
  const openTimerRef = useRef(null);
  const closeTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(openTimerRef.current);
      clearTimeout(closeTimerRef.current);
    };
  }, []);

  const toggle = useCallback(() => {
    if (!active) {
      clearTimeout(closeTimerRef.current);
      setActive(true);
      setBuzzing(true);

      if (window.innerWidth <= 800 && navigator.vibrate) {
        navigator.vibrate([50, 40, 50]);
      }

      // Let the signal buzz first, then reveal tabs/panel.
      openTimerRef.current = setTimeout(() => {
        setReady(true);
        setBuzzing(false);
      }, 520);
    } else {
      clearTimeout(openTimerRef.current);
      setReady(false);
      setBuzzing(false);
      closeTimerRef.current = setTimeout(() => setActive(false), 220);
    }
  }, [active]);

  return (
    <section id="contact" className="contact section-base" aria-label="Contact">
      <SectionHeader num="05" label="Let's Connect" title="CONTACT" />

      <div className={`contact__stage${active ? ' contact__stage--open' : ''}${ready ? ' contact__stage--ready' : ''}`}>

        {/* ── Signal wrapper — animates from centre to left ── */}
        <div className={`contact__signal-wrap${active ? ' contact__signal-wrap--left' : ''}`}>
          <button
            className={`contact__signal-btn${active ? ' contact__signal-btn--active' : ''}${buzzing ? ' contact__signal-btn--buzzing' : ''}`}
            onClick={toggle}
            aria-label={active ? 'Collapse contact' : 'Reveal contact'}
            aria-expanded={active}
            data-hover>
            <SpiderSignal active={active} theme={theme || 'light'} />
          </button>
          <p className={`contact__signal-hint font-mono${active ? ' contact__signal-hint--active' : ''}`}>
            {active ? 'click to close' : 'click to reveal'}
          </p>
        </div>

        {/* ── Right panel — fades in after signal settles ── */}
        <div className={`contact__panel${ready ? ' contact__panel--open' : ''}`}
          aria-hidden={!ready}>

          <div className="contact__tabs font-mono" role="tablist">
            <button role="tab" aria-selected={tab === 'connect'}
              className={`contact__tab${tab === 'connect' ? ' contact__tab--active' : ''}`}
              onClick={() => setTab('connect')}>
              ◈ connect
            </button>
            <button role="tab" aria-selected={tab === 'message'}
              className={`contact__tab${tab === 'message' ? ' contact__tab--active' : ''}`}
              onClick={() => setTab('message')}>
              ◈ send message
            </button>
          </div>

          {/* Connect tab */}
          <div className={`contact__tab-panel${tab === 'connect' ? ' contact__tab-panel--active' : ''}`}
            role="tabpanel">
            <p className="contact__intro">
              Open to internship opportunities, freelance projects, and collaborations in
              Full Stack Development and AI. If you've got something interesting — let's talk.
            </p>
            <div className="contact__links">
              {contactLinks.map((link, i) => (
                <ContactLink key={link.label} {...link} index={i}
                  visible={ready && tab === 'connect'} />
              ))}
            </div>
          </div>

          {/* Message tab */}
          <div className={`contact__tab-panel${tab === 'message' ? ' contact__tab-panel--active' : ''}`}
            role="tabpanel">
            <Terminal theme={theme} visible={ready && tab === 'message'} />
          </div>
        </div>
      </div>
    </section>
  );
}