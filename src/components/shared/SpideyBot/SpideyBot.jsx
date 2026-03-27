import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  personal,
  education,
  skillCategories,
  certifications,
  softSkills,
  experience,
  projects,
  contactLinks,
} from '../../../data/portfolio';
import './SpideyBot.css';

const SECTION_IDS = ['about', 'skills', 'experience', 'projects', 'contact'];
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash';
const HAS_GEMINI_KEY = Boolean(GEMINI_API_KEY);
const GEMINI_FALLBACK_MODELS = [
  GEMINI_MODEL,
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

const UNRELATED_DOMAINS = [
  'music', 'singing', 'dj', 'dance', 'choreography', 'guitar', 'piano',
  'chef', 'cooking', 'baking', 'doctor', 'nurse', 'medicine', 'lawyer',
  'law', 'mechanical', 'civil engineering', 'biology', 'chemistry',
];

const MANUAL_TECH_ALIASES = {
  angular: ['angular', 'angularjs'],
  react: ['react', 'react.js'],
  javascript: ['javascript', 'js'],
  'node.js': ['node', 'nodejs', 'node.js'],
  'express.js': ['express', 'express.js'],
  mongodb: ['mongodb', 'mongo'],
  postgresql: ['postgres', 'postgresql'],
  'django rest': ['django rest', 'django rest framework', 'drf'],
  'mern stack': ['mern', 'mern stack'],
  'ai apis': ['ai api', 'ai apis', 'llm api', 'genai api'],
  'generative ai': ['generative ai', 'gen ai', 'llm'],
  'rest apis': ['rest', 'rest api', 'rest apis'],
  microservices: ['microservice', 'microservices'],
};

const STACK_ALIASES = {
  'mean stack': ['angular', 'node.js', 'express.js', 'mongodb'],
  'mern stack': ['react', 'node.js', 'express.js', 'mongodb'],
};

const SOFTWARE_BUILD_HINTS = [
  'web app', 'website', 'dashboard', 'saas', 'frontend', 'backend', 'api',
  'react', 'node', 'express', 'mongodb', 'postgres', 'mern', 'mean', 'ai app', 'chatbot',
];

const NON_SOFTWARE_BUILD_TERMS = [
  'house', 'home', 'building', 'apartment', 'villa', 'bridge', 'road', 'car', 'bike',
  'truck', 'robot hardware', 'furniture', 'machine', 'factory', 'hospital', 'school building',
  'farm', 'garden', 'fence', 'boat', 'ship', 'airplane', 'drone',
];

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasTerm(text, term) {
  const haystack = ` ${normalizeText(text)} `;
  const needle = ` ${normalizeText(term)} `;
  return haystack.includes(needle);
}

function hasAnyTerm(text, terms) {
  return terms.some(term => hasTerm(text, term));
}

function toCanonicalTech(term) {
  return normalizeText(term)
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCase(text) {
  return text
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getAllSkills() {
  return skillCategories.flatMap(cat => cat.tags);
}

function buildPortfolioContext() {
  const projectLines = projects
    .map(p => `${p.title}: ${p.sub}; tech=${p.tech.join(', ')}; live=${p.liveUrl}; github=${p.githubUrl}`)
    .join('\n');

  const contactLines = contactLinks
    .map(link => `${link.label}: ${link.value} (${link.href})`)
    .join('\n');

  return [
    `Name: ${personal.name}`,
    `Tagline: ${personal.tagline}`,
    `Bio: ${personal.bio.join(' ')}`,
    `Skills: ${getAllSkills().join(', ')}`,
    `Experience: ${experience.map(e => `${e.role} at ${e.company} (${e.period}) using ${e.tech.join(', ')}`).join(' | ')}`,
    `Education: ${education.degree}, ${education.program}, ${education.enrollment}, ${education.years}, ${education.campus}`,
    `Certifications: ${certifications.map(c => `${c.label} (${c.href})`).join(' | ')}`,
    `Projects:\n${projectLines}`,
    `Contact:\n${contactLines}`,
    'Primary domain: software freelancing, full-stack web apps, AI-enabled products, microservices.',
  ].join('\n\n');
}

const PORTFOLIO_CONTEXT = buildPortfolioContext();

function dedupeLinks(links) {
  const seen = new Set();
  return links.filter((link) => {
    if (!link?.href || !link?.label) return false;
    if (seen.has(link.href)) return false;
    seen.add(link.href);
    return true;
  });
}

function inferLinksForQuery(input) {
  const lower = normalizeText(input);
  const links = [];

  if (/contact|email|phone|linkedin|github/.test(lower)) {
    links.push(...contactLinks.map(link => ({
      label: `${link.label}: ${link.value}`,
      href: link.href,
    })));
  }

  if (/project|portfolio|work sample|case study|fit score|required tech|requirements/.test(lower)) {
    links.push(...projects.flatMap(p => [
      { label: `${p.title} Live`, href: p.liveUrl },
      { label: `${p.title} GitHub`, href: p.githubUrl },
    ]));
  }

  if (/certificate|certification/.test(lower)) {
    links.push(...certifications.map(c => ({ label: c.label, href: c.href })));
  }

  return dedupeLinks(links);
}

function extractLinksFromText(text) {
  const matches = text.match(/(https?:\/\/[^\s)]+|mailto:[^\s)]+|tel:\+?[0-9][0-9\-]*)/g) || [];
  return dedupeLinks(matches.map((url, index) => ({
    label: `Reference ${index + 1}`,
    href: url,
  })));
}

async function askGemini(message, botName) {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing Gemini API key');
  }

  const systemPrompt = [
    `You are ${botName} for a portfolio website.`,
    'Audience is potential clients evaluating project fit and candidate details.',
    'Answer only from provided portfolio context. If data is not available, say it clearly.',
    'Focus on relevance, practical fit, and concise professional language.',
    'Important scope guard: this profile is web-app focused and should not claim mobile app implementation expertise unless explicitly present in context.',
    'If user asks about unrelated domains, clarify that the profile is software-focused.',
    'For fit requests, ask for scope, timeline, budget, and required stack if missing.',
    'If user asks contact, include email, phone, LinkedIn, and GitHub from context.',
    'Keep responses concise unless deep detail is asked.',
  ].join('\n');

  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{
      role: 'user',
      parts: [{
        text: `Portfolio context:\n${PORTFOLIO_CONTEXT}\n\n${message}`,
      }],
    }],
    generationConfig: {
      temperature: 0.45,
      maxOutputTokens: 420,
    },
  };

  const uniqueModels = [...new Set(GEMINI_FALLBACK_MODELS.filter(Boolean))];
  let lastError = null;

  for (const model of uniqueModels) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      lastError = `Gemini request failed for model ${model}: ${response.status} ${errorText}`;
      if (response.status === 404) {
        continue;
      }
      throw new Error(lastError);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts
      ?.map(part => part?.text || '')
      .join('')
      .trim();

    if (text) {
      return text;
    }

    lastError = `Gemini returned empty content for model ${model}`;
  }

  throw new Error(lastError || 'Gemini request failed for all candidate models');
}

function buildConversationForGemini(messages, latestUserInput) {
  const turns = messages
    .filter(msg => msg.role === 'user' || msg.role === 'assistant')
    .slice(-8)
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
    .join('\n');

  return [
    'Conversation history:',
    turns || 'No previous messages.',
    '',
    `Latest user question: ${latestUserInput}`,
  ].join('\n');
}

function isFitQuestion(text) {
  return /(fit|suitable|hire|client project|project scope|requirements|required tech|tech stack)/
    .test(normalizeText(text));
}

function isLikelyFollowUpTechInput(text) {
  const lower = normalizeText(text);
  const wordCount = lower ? lower.split(' ').length : 0;
  return wordCount <= 6 && /stack|mean|mern|react|node|express|mongo|angular|postgres|python|django|ai/.test(lower);
}

function normalizeFollowUpInput(text, shouldForceFit) {
  if (!shouldForceFit) return text;
  if (/required tech|fit score|tech stack/i.test(text)) return text;
  return `Required tech stack: ${text}`;
}

function buildTechAliasMap() {
  const map = new Map();
  Object.entries(MANUAL_TECH_ALIASES).forEach(([canonical, aliases]) => {
    map.set(canonical, aliases.map(a => normalizeText(a)));
  });

  getAllSkills().forEach((tag) => {
    const canonical = toCanonicalTech(tag);
    if (!map.has(canonical)) {
      map.set(canonical, [canonical]);
    }
  });

  experience.forEach((item) => {
    item.tech.forEach((tag) => {
      const canonical = toCanonicalTech(tag);
      if (!map.has(canonical)) {
        map.set(canonical, [canonical]);
      }
    });
  });

  projects.forEach((item) => {
    item.tech.forEach((tag) => {
      const canonical = toCanonicalTech(tag);
      if (!map.has(canonical)) {
        map.set(canonical, [canonical]);
      }
    });
  });

  return map;
}

function extractTechsFromText(input, techAliasMap) {
  const lower = normalizeText(input);
  const found = [];

  techAliasMap.forEach((aliases, canonical) => {
    if (aliases.some(alias => hasTerm(lower, alias))) {
      found.push(canonical);
    }
  });

  return [...new Set(found)];
}

function extractTechsWithStackExpansion(input, techAliasMap) {
  const lower = normalizeText(input);
  const stackExpanded = [];

  Object.entries(STACK_ALIASES).forEach(([stackName, techs]) => {
    if (hasTerm(lower, stackName)) {
      stackExpanded.push(...techs);
    }
  });

  const direct = extractTechsFromText(input, techAliasMap);
  return [...new Set([...direct, ...stackExpanded.map(toCanonicalTech)])];
}

function buildCoverage(techAliasMap) {
  const skillSet = new Set(extractTechsFromText(getAllSkills().join(' '), techAliasMap));
  const expSet = new Set(
    experience.flatMap(item => extractTechsFromText(item.tech.join(' '), techAliasMap))
  );
  const projectCoverage = projects.map(project => ({
    project,
    techs: new Set(extractTechsFromText(project.tech.join(' '), techAliasMap)),
  }));

  return { skillSet, expSet, projectCoverage };
}

function scoreClientFit(requiredTechs, coverage) {
  if (!requiredTechs.length) {
    return null;
  }

  let points = 0;
  const matched = [];
  const missing = [];

  requiredTechs.forEach((tech) => {
    const inSkill = coverage.skillSet.has(tech);
    const inExp = coverage.expSet.has(tech);
    const inProject = coverage.projectCoverage.some(p => p.techs.has(tech));

    if (!inSkill && !inExp && !inProject) {
      missing.push(tech);
      return;
    }

    matched.push(tech);
    points += Math.max(
      inSkill ? 1 : 0,
      inExp ? 0.9 : 0,
      inProject ? 0.75 : 0
    );
  });

  const score = Math.round((points / requiredTechs.length) * 100);

  const projectMatches = coverage.projectCoverage
    .map(({ project, techs }) => {
      const overlap = requiredTechs.filter(t => techs.has(t));
      return {
        project,
        overlap,
        overlapScore: Math.round((overlap.length / requiredTechs.length) * 100),
      };
    })
    .filter(item => item.overlap.length)
    .sort((a, b) => b.overlap.length - a.overlap.length)
    .slice(0, 2);

  return { score, matched, missing, projectMatches };
}

function formatTechList(list) {
  return list.map(toTitleCase).join(', ');
}

function parseFitTarget(input) {
  const lower = normalizeText(input);
  const match = lower.match(/(?:fit|suitable|good|right)\s+for\s+([a-z0-9+#.\s]{2,80})/);
  return match?.[1]?.trim() || '';
}

function getLocalPortfolioReply(message, botName, techAliasMap, coverage) {
  const input = message.trim();
  const lower = normalizeText(input);
  const requiredTechs = extractTechsWithStackExpansion(input, techAliasMap);
  const fitTarget = parseFitTarget(input);
  const fitScore = scoreClientFit(requiredTechs, coverage);

  const directSection = SECTION_IDS.find(id =>
    hasTerm(lower, `go to ${id}`) ||
    hasTerm(lower, `open ${id}`) ||
    hasTerm(lower, `show ${id}`) ||
    lower === id
  );

  if (directSection) {
    return {
      sectionId: directSection,
      text: `Opening ${toTitleCase(directSection)} section now.`,
    };
  }

  if (/contact|email|phone|linkedin|github/.test(lower)) {
    return {
      sectionId: 'contact',
      text: 'Here are direct contact links. I am taking you to Contact.',
      links: contactLinks.map(link => ({
        label: `${link.label}: ${link.value}`,
        href: link.href,
      })),
    };
  }

  if (/(can\s+(she|you)\s+build|build\s+an?)/.test(lower)) {
    const hasSoftwareHint = hasAnyTerm(lower, SOFTWARE_BUILD_HINTS);
    const hasNonSoftwareHint = hasAnyTerm(lower, NON_SOFTWARE_BUILD_TERMS);

    if (hasNonSoftwareHint && !hasSoftwareHint) {
      return {
        text: `No, she does not build non-software things like that. Her scope is software engineering, specifically web applications and related backend/API systems. If you share a web project scope, I can assess fit with score and examples.`,
        localOnly: true,
      };
    }
  }

  if (/(mobile app|mobile apps|android|ios|react native|flutter|swift|kotlin)/.test(lower)) {
    return {
      sectionId: 'projects',
      text: `She is currently focused on web applications, not native/hybrid mobile app delivery. Her strongest area is full-stack web products (MERN/React/Node), AI-enabled web apps, and scalable APIs. If your requirement is web-first, she is a strong fit. If you need mobile too, share scope and we can discuss a phased web-first approach or collaboration strategy.`,
      links: dedupeLinks([
        ...projects.flatMap(p => [
          { label: `${p.title} Live`, href: p.liveUrl },
          { label: `${p.title} GitHub`, href: p.githubUrl },
        ]),
        ...contactLinks.map(link => ({ label: `${link.label}: ${link.value}`, href: link.href })),
      ]),
      localOnly: true,
    };
  }

  if (/(industry trend|industry trends|market trend|trending tech|latest trend|what should i build|best stack|future proof)/.test(lower)) {
    return {
      sectionId: 'projects',
      text: `Current industry direction favors AI-assisted UX, fast web performance, API-first architecture, and modular scalable systems. Typical client evaluation questions now are: delivery speed, scalability, maintainability, AI value, and total cost. She aligns well with these trends through React/Node web apps, microservice exposure, and AI-enabled project experience. Share your goals and required stack for a tailored fit score and execution recommendation.`,
      links: projects.flatMap(p => [
        { label: `${p.title} Live`, href: p.liveUrl },
        { label: `${p.title} GitHub`, href: p.githubUrl },
      ]),
    };
  }

  if (/(can\s+(she|you)\s+build|build\s+an?|build\s+ai|ai\s+project|other\s+projects)/.test(lower)) {
    return {
      sectionId: 'projects',
      text: `Yes, she can build AI-enabled and other modern web projects. Her portfolio includes production-style work in full-stack development, AI-integrated apps, and scalable systems. Opening Projects section now so you can review relevant examples.`,
      links: projects.flatMap(p => [
        { label: `${p.title} Live`, href: p.liveUrl },
        { label: `${p.title} GitHub`, href: p.githubUrl },
      ]),
    };
  }

  if (/(fit score|required tech|requirements|client project|project scope|tech stack)/.test(lower) || requiredTechs.length >= 2) {
    if (!fitScore) {
      return {
        text: 'Share required technologies and I will compute a fit score. Example: Required tech: React, Node.js, MongoDB, PostgreSQL.',
      };
    }

    const topProjects = fitScore.projectMatches;
    const verdict = fitScore.score >= 80
      ? 'Strong fit'
      : fitScore.score >= 60
        ? 'Good fit'
        : fitScore.score >= 40
          ? 'Partial fit'
          : 'Low fit';

    const isMeanStackCase = hasTerm(lower, 'mean stack') || requiredTechs.includes('angular');

    if (isMeanStackCase) {
      return {
        sectionId: 'projects',
        text: `For a MEAN-stack project: she is strongest in MERN and modern React-based frontend development. Angular is not her primary stack right now, but she can adapt quickly based on your requirements. Please share frontend complexity, API scope, timeline, and budget so fit can be validated. Estimated overlap for this request is ${fitScore.score}%.`,
        fit: {
          score: fitScore.score,
          matched: fitScore.matched,
          missing: fitScore.missing,
        },
        links: dedupeLinks([
          ...contactLinks.map(link => ({ label: `${link.label}: ${link.value}`, href: link.href })),
          ...projects.flatMap(p => [
            { label: `${p.title} Live`, href: p.liveUrl },
            { label: `${p.title} GitHub`, href: p.githubUrl },
          ]),
        ]),
      };
    }

    return {
      sectionId: 'projects',
      text: `${verdict}: ${fitScore.score}% match for required stack (${formatTechList(requiredTechs)}).`,
      fit: {
        score: fitScore.score,
        matched: fitScore.matched,
        missing: fitScore.missing,
      },
      links: topProjects.flatMap(item => [
        { label: `${item.project.title} Live`, href: item.project.liveUrl },
        { label: `${item.project.title} GitHub`, href: item.project.githubUrl },
      ]),
    };
  }

  if (/freelanc|hire|fit|suitable|why you/.test(lower)) {
    const currentRole = experience[0];

    if (fitTarget) {
      const unrelated = UNRELATED_DOMAINS.some(domain => hasTerm(fitTarget, domain));
      if (unrelated) {
        return {
          text: `Not a direct fit for ${fitTarget}. This portfolio is focused on software freelancing: full-stack web development, microservices, and AI-enabled apps. If you share your project tech requirements, I can score the fit precisely.`,
        };
      }
    }

    const coreSkills = getAllSkills().slice(0, 8);
    const projectNames = projects.map(p => p.title).join(', ');

    return {
      sectionId: 'projects',
      text: `${personal.name} is a strong fit for software freelancing. Evidence: shipped projects (${projectNames}), internship at ${currentRole.company}, and stack strength in ${coreSkills.join(', ')}. Paste your required tech stack and I will return a fit score with matching projects.`,
      links: [
        { label: 'GitHub Profile', href: personal.githubUrl },
        { label: 'LinkedIn Profile', href: contactLinks.find(link => link.label === 'LinkedIn')?.href || '#' },
      ],
    };
  }

  if (/project|portfolio|work sample|case study/.test(lower)) {
    return {
      sectionId: 'projects',
      text: `Featured projects are ${projects.map(p => p.title).join(', ')}. Opening Projects section now.`,
      links: projects.flatMap(p => [
        { label: `${p.title} Live`, href: p.liveUrl },
        { label: `${p.title} GitHub`, href: p.githubUrl },
      ]),
    };
  }

  if (/skill|stack|technology|tech|tools|mern|ai/.test(lower)) {
    const skills = getAllSkills();
    return {
      sectionId: 'skills',
      text: `Core skills include ${skills.join(', ')}. Opening Skills section now.`,
    };
  }

  if (/experience|intern|work|job|company/.test(lower)) {
    const role = experience[0];
    return {
      sectionId: 'experience',
      text: `Experience highlight: ${role.role} at ${role.company} (${role.period}). Focus areas include ${role.tech.join(', ')} and microservice delivery. Opening Experience section now.`,
    };
  }

  if (/education|college|degree|study/.test(lower)) {
    return {
      sectionId: 'about',
      text: `Education: ${education.degree} at ${education.program}, ${education.enrollment}, ${education.years} (${education.campus}). Opening About section now.`,
    };
  }

  if (/certificate|certification/.test(lower)) {
    return {
      sectionId: 'skills',
      text: `Certifications: ${certifications.map(c => c.label).join(' | ')}. Opening Skills section where certifications are shown.`,
      links: certifications.map(c => ({ label: c.label, href: c.href })),
    };
  }

  if (/about|who are you|introduce|bio/.test(lower)) {
    return {
      sectionId: 'about',
      text: `${personal.bio[0]} ${personal.bio[1]} Opening About section for more details.`,
    };
  }

  if (/soft skill|communication|team|collaboration/.test(lower)) {
    return {
      text: `Soft-skill strengths: ${softSkills.join(', ')}.`,
    };
  }

  return {
    text: `${botName} helps clients evaluate project fit and portfolio details. Try: "Required tech: React, Node.js, MongoDB", "Is she fit for freelancing?", "Show contact", or "Open projects".`,
  };
}

function smoothScrollToSection(sectionId) {
  const node = document.getElementById(sectionId);
  if (!node) return;
  node.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Drag + Resize hook for mobile bottom sheet ────────────────────
   - Drag handle pill: drag UP/DOWN to resize panel height
   - If dragged far DOWN past threshold → close the panel
   - Horizontal drag is ignored (sheet is full-width on mobile)
   - On desktop the panel is a floating card; drag moves it freely
────────────────────────────────────────────────────────────────────── */
function useBoundedDrag(isOpen, onClose) {
  const panelRef = useRef(null);

  // ── desktop move drag state ──
  const moveDragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
    panelLeft: 0,
    panelTop: 0,
    panelW: 0,
    panelH: 0,
    pointerId: null,
  });

  // ── mobile resize drag state ──
  const resizeDragRef = useRef({
    active: false,
    startY: 0,
    startHeight: 0,
    pointerId: null,
  });

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [panelHeight, setPanelHeight] = useState(null);

  const isMobileViewport = useCallback(() => window.matchMedia('(max-width: 480px)').matches, []);

  // Reset all state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setOffset({ x: 0, y: 0 });
      setIsDragging(false);
      setPanelHeight(null);
      moveDragRef.current.active = false;
      resizeDragRef.current.active = false;
    }
  }, [isOpen]);

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  /* ── Pointer down on the drag-handle pill ──
     Mobile  → start resize drag
     Desktop → start move drag
  */
  const onPointerDown = useCallback((e) => {
    if (!isOpen || !panelRef.current) return;
    e.preventDefault();

    if (isMobileViewport()) {
      // Mobile: resize by dragging the pill up/down
      const rect = panelRef.current.getBoundingClientRect();
      const currentH = panelHeight || rect.height;

      resizeDragRef.current = {
        active: true,
        startY: e.clientY,
        startHeight: currentH,
        pointerId: e.pointerId,
      };
      setIsDragging(true);
    } else {
      // Desktop: move the floating panel
      const rect = panelRef.current.getBoundingClientRect();
      moveDragRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        baseX: offset.x,
        baseY: offset.y,
        panelLeft: rect.left,
        panelTop: rect.top,
        panelW: rect.width,
        panelH: rect.height,
        pointerId: e.pointerId,
      };
      setIsDragging(true);
    }
  }, [isOpen, isMobileViewport, panelHeight, offset.x, offset.y]);

  /* ── Pointer move ── */
  const onPointerMove = useCallback((e) => {
    // Mobile resize path
    const rs = resizeDragRef.current;
    if (rs.active && rs.pointerId === e.pointerId) {
      const minH = Math.round(window.innerHeight * 0.32);
      const maxH = Math.round(window.innerHeight * 0.92);
      // Dragging UP increases height (startY - currentY is positive when moving up)
      const delta = rs.startY - e.clientY;
      setPanelHeight(clamp(rs.startHeight + delta, minH, maxH));
      return;
    }

    // Desktop move path
    const ms = moveDragRef.current;
    if (!ms.active || ms.pointerId !== e.pointerId) return;

    const dx = e.clientX - ms.startX;
    const dy = e.clientY - ms.startY;
    const nextX = ms.baseX + dx;
    const nextY = ms.baseY + dy;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;
    const minX = margin - ms.panelLeft;
    const maxX = vw - ms.panelW - margin - ms.panelLeft;
    const minY = margin - ms.panelTop;
    const maxY = vh - ms.panelH - margin - ms.panelTop;

    setOffset({
      x: clamp(nextX, minX, maxX),
      y: clamp(nextY, minY, maxY),
    });
  }, []);

  /* ── Pointer up ── */
  const onPointerUp = useCallback((e) => {
    // Mobile resize path
    const rs = resizeDragRef.current;
    if (rs.active && rs.pointerId === e.pointerId) {
      rs.active = false;
      setIsDragging(false);

      // If user dragged far DOWN (shrinking below ~32% vh), close the panel
      if (panelHeight !== null && panelHeight < window.innerHeight * 0.28) {
        onClose();
      }
      return;
    }

    // Desktop move path
    const ms = moveDragRef.current;
    if (!ms.active || ms.pointerId !== e.pointerId) return;
    ms.active = false;
    setIsDragging(false);
  }, [panelHeight, onClose]);

  // Attach global pointer listeners while open
  useEffect(() => {
    if (!isOpen) return undefined;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [isOpen, onPointerMove, onPointerUp]);

  return { panelRef, offset, isDragging, onPointerDown, panelHeight };
}

export default function SpideyBot({ theme }) {
  const isDark  = theme === 'dark';
  const botName = isDark ? 'Venom Bot' : 'Spidey Bot';
  const botIcon = isDark ? '🕷' : '🕸';

  const [isOpen,    setIsOpen]    = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [modeBadge,  setModeBadge]  = useState(() => (HAS_GEMINI_KEY ? 'Gemini online' : 'Fallback mode'));
  const [lastIntentWasFit, setLastIntentWasFit] = useState(false);
  const [input, setInput] = useState('');
  const messagesRef = useRef(null);
  const techAliasMap = useMemo(() => buildTechAliasMap(), []);
  const coverage     = useMemo(() => buildCoverage(techAliasMap), [techAliasMap]);

  const handleClose = useCallback(() => setIsOpen(false), []);
  const {
    panelRef,
    offset,
    isDragging,
    onPointerDown,
    panelHeight,
  } = useBoundedDrag(isOpen, handleClose);

  const [messages, setMessages] = useState(() => [
    {
      id: 'init',
      role: 'assistant',
      text: `Hi, I am ${botName}. I help clients check project fit and learn key details about this profile. Share required tech for a fit score, or ask about skills, projects, experience, and contact.`,
    },
  ]);

  const quickPrompts = useMemo(() => [
    'Required tech: React, Node.js, MongoDB, AI APIs',
    'Is she fit for freelancing?',
    'Can she build an AI travel platform?',
    'Show projects',
    'Contact details',
  ], []);

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, isThinking]);

  const sendMessage = useCallback(async (raw) => {
    const text = raw.trim();
    if (!text) return;

    const shouldForceFit = lastIntentWasFit && isLikelyFollowUpTechInput(text);
    const contextualInput = normalizeFollowUpInput(text, shouldForceFit);

    const userMsg = { id: `u-${Date.now()}`, role: 'user', text };
    const historySnapshot = [...messages, userMsg];
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    const localReply = getLocalPortfolioReply(contextualInput, botName, techAliasMap, coverage);
    const requiredTechs = extractTechsWithStackExpansion(contextualInput, techAliasMap);
    const needsDeterministicScoring = /(fit score|required tech|requirements|client project|project scope|tech stack)/
      .test(normalizeText(contextualInput)) || requiredTechs.length >= 2;

    let finalReply = localReply;

    if (!needsDeterministicScoring && !localReply.localOnly) {
      try {
        const promptWithHistory = buildConversationForGemini(historySnapshot, contextualInput);
        const geminiText = await askGemini(promptWithHistory, botName);
        finalReply = {
          ...localReply,
          text: geminiText,
          links: dedupeLinks([
            ...(localReply.links || []),
            ...inferLinksForQuery(contextualInput),
            ...extractLinksFromText(geminiText),
          ]),
        };
        setModeBadge('Gemini online');
      } catch {
        finalReply = {
          ...localReply,
          links: dedupeLinks([
            ...(localReply.links || []),
            ...inferLinksForQuery(contextualInput),
          ]),
        };
        setModeBadge('Fallback mode');
      }
    } else {
      finalReply = {
        ...localReply,
        links: dedupeLinks([
          ...(localReply.links || []),
          ...inferLinksForQuery(contextualInput),
        ]),
      };
      setModeBadge(HAS_GEMINI_KEY ? 'Gemini online' : 'Fallback mode');
    }

    const botMsg = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: finalReply.text,
      links: finalReply.links || [],
      fit: finalReply.fit,
    };

    setMessages(prev => [...prev, botMsg]);
    setIsThinking(false);

    if (finalReply.sectionId) {
      smoothScrollToSection(finalReply.sectionId);
    }

    setLastIntentWasFit(isFitQuestion(contextualInput));
  }, [botName, coverage, techAliasMap, lastIntentWasFit, messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isThinking) return;
    sendMessage(input);
  };

  const panelStyle = {
    ...(offset.x !== 0 || offset.y !== 0
      ? {
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          transition: isDragging ? 'none' : undefined,
        }
      : {}),
    ...(panelHeight ? { height: `${panelHeight}px`, maxHeight: 'none' } : {}),
  };

  return (
    <div className={`spidey-bot${isOpen ? ' spidey-bot--open' : ''}${isDragging ? ' spidey-bot--resizing' : ''}`} aria-live="polite">
      <section
        ref={panelRef}
        className="spidey-bot__panel"
        style={panelStyle}
        aria-label={`${botName} assistant`}
        aria-hidden={!isOpen}
      >
        {/*
          Drag handle — on mobile this resizes the panel height.
          Drag UP  → taller panel
          Drag DOWN past threshold → closes the panel
          On desktop this moves the floating card.
        */}
        <div
          className="spidey-bot__drag-handle"
          onPointerDown={onPointerDown}
          aria-label="Drag to resize"
          role="separator"
          aria-orientation="horizontal"
        >
          <span className="spidey-bot__drag-pill" />
          {/* Small resize hint arrows rendered via CSS pseudo-elements */}
          <span className="spidey-bot__drag-hint" aria-hidden="true">↕</span>
        </div>

        <header className="spidey-bot__header">
          <div className="spidey-bot__title-wrap">
            <span className="spidey-bot__avatar" aria-hidden="true">{botIcon}</span>
            <div>
              <p className="spidey-bot__title">{botName}</p>
              <p className="spidey-bot__subtitle">Portfolio assistant</p>
            </div>
          </div>
          <span className={`spidey-bot__mode-badge${modeBadge === 'Fallback mode' ? ' spidey-bot__mode-badge--fallback' : ''}`}>
            {modeBadge}
          </span>
          <button
            type="button"
            className="spidey-bot__close"
            onClick={handleClose}
            aria-label="Close assistant"
          >
            ✕
          </button>
        </header>

        <div className="spidey-bot__quick-actions">
          {quickPrompts.map(prompt => (
            <button
              type="button"
              key={prompt}
              className="spidey-bot__chip"
              onClick={() => sendMessage(prompt)}
              disabled={isThinking}
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="spidey-bot__messages" ref={messagesRef}>
          {messages.map(msg => (
            <article
              key={msg.id}
              className={`spidey-bot__message spidey-bot__message--${msg.role}`}
            >
              <p className="spidey-bot__message-text">{msg.text}</p>

              {msg.fit && (
                <div className="spidey-bot__fit">
                  <div className="spidey-bot__fit-score">
                    <span>Fit score</span>
                    <strong>{msg.fit.score}%</strong>
                  </div>
                  <div className="spidey-bot__fit-row">
                    <span>Matched:</span>
                    <span>{msg.fit.matched.length ? formatTechList(msg.fit.matched) : 'None'}</span>
                  </div>
                  <div className="spidey-bot__fit-row">
                    <span>Missing:</span>
                    <span>{msg.fit.missing.length ? formatTechList(msg.fit.missing) : 'No major gaps'}</span>
                  </div>
                </div>
              )}

              {!!msg.links?.length && (
                <div className="spidey-bot__links">
                  {msg.links.map(link => (
                    <a
                      key={`${msg.id}-${link.label}-${link.href}`}
                      className="spidey-bot__link"
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}

          {isThinking && (
            <article className="spidey-bot__message spidey-bot__message--assistant spidey-bot__message--typing">
              <p className="spidey-bot__message-text">Analyzing fit and portfolio context...</p>
            </article>
          )}
        </div>

        <form className="spidey-bot__form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about fit, projects, contact..."
            className="spidey-bot__input"
            aria-label="Ask the portfolio assistant"
            disabled={isThinking}
          />
          <button type="submit" className="spidey-bot__send" disabled={isThinking}>
            {isThinking ? '...' : 'Send'}
          </button>
        </form>
      </section>

      {/* FAB — hidden while panel is open */}
      <button
        type="button"
        className="spidey-bot__fab"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={`Open ${botName}`}
        aria-expanded={isOpen}
      >
        <span aria-hidden="true" className="spidey-bot__fab-icon">{botIcon}</span>
        <span className="spidey-bot__fab-text">{isDark ? 'Venom Bot' : 'Spidey Bot'}</span>
      </button>
    </div>
  );
}