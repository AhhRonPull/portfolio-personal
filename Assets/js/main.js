// @js
// Portfolio main script — premium fintech redesign
// Classes: HeroCanvas, HeroHeadlineReveal, LenisScroller, ProjectTiltCards,
//          NdaDeclassify, SkillsTerminal, ScrollAnimator, NavigationHighlighter,
//          ProjectDetailsModal, ProjectFilterPaginator, PortfolioApp

console.info('[portfolio] main.js loaded — premium fintech build');

/* ============================================================
   Utility
   ============================================================ */
const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   HeroCanvas — Gojo-aura candlestick tick field
   ============================================================ */
class HeroCanvas {
  constructor(canvasId) {
    this.canvas  = document.getElementById(canvasId);
    this.ctx     = this.canvas ? this.canvas.getContext('2d') : null;
    this.ticks   = [];
    this.mouse   = { x: -9999, y: -9999 };
    this.targets = [];   // silhouette target points
    this.raf     = null;
    this.TICK_COUNT  = 130;
    this.RADIUS      = 190;   // mouse influence radius
    this.LERP_SPEED  = 0.055; // how fast ticks migrate
    this.DRIFT_SPEED = 0.3;   // Brownian drift magnitude
  }

  init() {
    if (!this.canvas || !this.ctx) return;
    if (prefersReducedMotion()) return;

    this.resize();
    this.generateTicks();
    this.bindEvents();
    this.loop();
  }

  resize() {
    const section = this.canvas.parentElement;
    this.canvas.width  = section.offsetWidth;
    this.canvas.height = section.offsetHeight;
    this.targets = this.buildGojoBust();
  }

  /* ----------------------------------------------------------
     Gojo-inspired silhouette target points
     Head ellipse + circular halo ring (Six Eyes aura) +
     spiky white hair + neck + shoulders
  ---------------------------------------------------------- */
  buildGojoBust() {
    const W  = this.canvas.width;
    const H  = this.canvas.height;
    const cx = W * 0.72;  // bust center-x (right side)
    const cy = H * 0.46;  // bust center-y

    const pts = [];

    // ── Head ellipse ──────────────────────────────────────
    const headRx = 54, headRy = 64;
    for (let i = 0; i < 40; i++) {
      const t = (i / 40) * Math.PI * 2;
      pts.push({
        x: cx + headRx * Math.cos(t),
        y: cy - 40 + headRy * Math.sin(t),
      });
    }

    // ── Circular halo ring (Gojo Six Eyes / Domain aura) ──
    const haloR = 138;
    for (let i = 0; i < 55; i++) {
      const t = (i / 55) * Math.PI * 2;
      pts.push({
        x: cx + haloR * Math.cos(t),
        y: cy - 40 + haloR * Math.sin(t) * 0.82,
      });
    }

    // ── Inner aura ring (slightly smaller) ────────────────
    const innerR = 100;
    for (let i = 0; i < 30; i++) {
      const t = (i / 30) * Math.PI * 2;
      pts.push({
        x: cx + innerR * Math.cos(t),
        y: cy - 40 + innerR * Math.sin(t) * 0.82,
      });
    }

    // ── Spiky hair — radiating upward from head ──────────
    const spikeAngles = [-1.65, -1.45, -1.25, -1.05, -0.85, -0.65];
    for (const ang of spikeAngles) {
      const spikeLen = 80 + Math.random() * 35;
      for (let k = 0; k < 5; k++) {
        const r = (headRy + 8) + (k / 4) * spikeLen;
        pts.push({
          x: cx + r * Math.cos(ang) * (headRx / headRy),
          y: (cy - 40) + r * Math.sin(ang),
        });
      }
    }

    // ── Neck ──────────────────────────────────────────────
    const neckTop = cy - 40 + headRy;
    for (let i = 0; i < 8; i++) {
      pts.push({
        x: cx + (Math.random() - 0.5) * 24,
        y: neckTop + (i / 7) * 36,
      });
    }

    // ── Shoulders ─────────────────────────────────────────
    const shoulderY = neckTop + 36;
    for (let i = 0; i < 28; i++) {
      const t  = i / 27;
      const side = t < 0.5 ? -1 : 1;
      const st = t < 0.5 ? t * 2 : (t - 0.5) * 2;
      pts.push({
        x: cx + side * (18 + st * 110),
        y: shoulderY + st * 48,
      });
    }

    return pts;
  }

  /* ----------------------------------------------------------
     Generate tick objects
  ---------------------------------------------------------- */
  generateTicks() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    this.ticks = [];
    for (let i = 0; i < this.TICK_COUNT; i++) {
      const isBullish = Math.random() > 0.48;
      this.ticks.push({
        x:        Math.random() * W,
        y:        Math.random() * H,
        targetX:  null,
        targetY:  null,
        bodyH:    6 + Math.random() * 10,   // candle body height
        wickTop:  4 + Math.random() * 7,
        wickBot:  3 + Math.random() * 5,
        isBullish,
        // Brownian drift
        dx: (Math.random() - 0.5) * this.DRIFT_SPEED,
        dy: (Math.random() - 0.5) * this.DRIFT_SPEED,
        opacity: 0.25 + Math.random() * 0.55,
      });
    }
  }

  /* ----------------------------------------------------------
     Bind events
  ---------------------------------------------------------- */
  bindEvents() {
    const hero = this.canvas.parentElement;
    hero.addEventListener('mousemove', (e) => {
      const rect  = hero.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.assignTargets();
    });

    hero.addEventListener('mouseleave', () => {
      this.mouse.x = -9999;
      this.mouse.y = -9999;
      this.ticks.forEach(t => { t.targetX = null; t.targetY = null; });
    });

    window.addEventListener('resize', () => {
      this.resize();
      this.generateTicks();
    });
  }

  /* ----------------------------------------------------------
     Assign silhouette target points to nearby ticks
  ---------------------------------------------------------- */
  assignTargets() {
    const near = this.ticks.filter(t => {
      const dx = t.x - this.mouse.x;
      const dy = t.y - this.mouse.y;
      return Math.sqrt(dx * dx + dy * dy) < this.RADIUS;
    });

    near.forEach((tick, i) => {
      const pt = this.targets[i % this.targets.length];
      tick.targetX = pt.x;
      tick.targetY = pt.y;
    });

    // Clear targets for ticks now outside radius
    this.ticks.forEach(t => {
      const dx = t.x - this.mouse.x;
      const dy = t.y - this.mouse.y;
      if (Math.sqrt(dx * dx + dy * dy) >= this.RADIUS) {
        t.targetX = null;
        t.targetY = null;
      }
    });
  }

  /* ----------------------------------------------------------
     Draw one candlestick tick
  ---------------------------------------------------------- */
  drawTick(t) {
    const ctx = this.ctx;
    const bullColor = `rgba(79, 163, 122, ${t.opacity})`;   // --green
    const bearColor = `rgba(184, 84, 80,  ${t.opacity})`;   // --red
    const color = t.isBullish ? bullColor : bearColor;

    const bodyW = 2;
    const bodyTop = t.y - t.bodyH / 2;

    ctx.strokeStyle = color;
    ctx.lineWidth   = 1;

    // Wick top
    ctx.beginPath();
    ctx.moveTo(t.x, bodyTop - t.wickTop);
    ctx.lineTo(t.x, bodyTop);
    ctx.stroke();

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(t.x - bodyW / 2, bodyTop, bodyW, t.bodyH);

    // Wick bottom
    ctx.beginPath();
    ctx.moveTo(t.x, bodyTop + t.bodyH);
    ctx.lineTo(t.x, bodyTop + t.bodyH + t.wickBot);
    ctx.stroke();
  }

  /* ----------------------------------------------------------
     Animation loop
  ---------------------------------------------------------- */
  loop() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const t of this.ticks) {
      if (t.targetX !== null && t.targetY !== null) {
        // Lerp toward silhouette target
        t.x += (t.targetX - t.x) * this.LERP_SPEED;
        t.y += (t.targetY - t.y) * this.LERP_SPEED;
      } else {
        // Brownian drift + soft boundary bounce
        t.x += t.dx;
        t.y += t.dy;

        // Nudge drift occasionally
        if (Math.random() < 0.012) {
          t.dx = (Math.random() - 0.5) * this.DRIFT_SPEED;
          t.dy = (Math.random() - 0.5) * this.DRIFT_SPEED;
        }

        // Wrap around canvas edges
        if (t.x < -10) t.x = this.canvas.width + 10;
        if (t.x > this.canvas.width  + 10) t.x = -10;
        if (t.y < -20) t.y = this.canvas.height + 20;
        if (t.y > this.canvas.height + 20) t.y = -20;
      }

      this.drawTick(t);
    }

    this.raf = requestAnimationFrame(() => this.loop());
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
  }
}

/* ============================================================
   HeroHeadlineReveal — SplitType + GSAP char stagger
   ============================================================ */
class HeroHeadlineReveal {
  init() {
    if (prefersReducedMotion()) return;

    const headline = document.getElementById('hero-headline');
    const eyebrow  = document.getElementById('hero-eyebrow');
    const sub      = document.getElementById('hero-sub');
    const cta      = document.getElementById('hero-cta');

    if (!headline) return;

    const hasSplitType = typeof SplitType !== 'undefined';
    const hasGsap      = typeof gsap !== 'undefined';

    if (hasSplitType && hasGsap) {
      const split = new SplitType(headline, { types: 'chars,words' });

      const tl = gsap.timeline({ delay: 0.1 });

      if (eyebrow) {
        tl.fromTo(eyebrow,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
        );
      }

      tl.fromTo(split.chars,
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.028, ease: 'power3.out', clearProps: 'all' },
        '-=0.2'
      );

      if (sub) {
        tl.fromTo(sub,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
          '-=0.3'
        );
      }

      if (cta) {
        tl.fromTo(cta,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' },
          '-=0.2'
        );
      }
    } else {
      // Fallback — just make everything visible
      [headline, eyebrow, sub, cta].forEach(el => {
        if (el) { el.style.opacity = '1'; el.style.transform = 'none'; }
      });
    }
  }
}

/* ============================================================
   LenisScroller — smooth inertial scrolling
   ============================================================ */
class LenisScroller {
  constructor() {
    this.lenis = null;
  }

  init() {
    if (prefersReducedMotion()) return;
    if (typeof Lenis === 'undefined') return;

    this.lenis = new Lenis({
      duration:   1.25,
      easing:     (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    // Wire into GSAP ticker if available
    if (typeof gsap !== 'undefined') {
      this.lenis.on('scroll', ScrollTrigger && ScrollTrigger.update
        ? ScrollTrigger.update
        : () => {}
      );
      gsap.ticker.add((time) => {
        this.lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    } else {
      // Fallback RAF loop
      const raf = (time) => {
        this.lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }
  }
}

/* ============================================================
   ProjectTiltCards — vanilla-tilt 3D depth
   ============================================================ */
class ProjectTiltCards {
  init() {
    // Skip on touch / reduced-motion
    if (prefersReducedMotion()) return;
    if (window.matchMedia('(hover: none)').matches) return;
    if (typeof VanillaTilt === 'undefined') return;

    const cards = document.querySelectorAll('.project-card');
    if (!cards.length) return;

    VanillaTilt.init(Array.from(cards), {
      max:       7,
      speed:     400,
      glare:     true,
      'max-glare': 0.07,
      scale:     1.015,
      gyroscope: false,
    });
  }
}

/* ============================================================
   NdaDeclassify — hover clip-path wipe on NDA thumbnails
   ============================================================ */
class NdaDeclassify {
  init() {
    const ndaThumbs = document.querySelectorAll('.project-thumb-nda');
    ndaThumbs.forEach(thumb => {
      // Inject overlay element if not present
      if (!thumb.querySelector('.nda-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'nda-overlay';
        thumb.appendChild(overlay);
      }

      const card = thumb.closest('.project-card');
      if (!card) return;

      card.addEventListener('mouseenter', () => {
        thumb.classList.add('nda-revealing');
      });
      card.addEventListener('mouseleave', () => {
        thumb.classList.remove('nda-revealing');
      });
    });
  }
}

/* ============================================================
   SkillsTerminal — interactive command-line skills display
   ============================================================ */
class SkillsTerminal {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.output    = null;
    this.input     = null;
    this.history   = [];
    this.histIdx   = -1;
    this.isTyping  = false;

    this.COMMANDS = {
      whoami: this.cmdWhoami.bind(this),
      'stack --list': this.cmdStack.bind(this),
      'experience --role=bi-intern':  this.cmdExpBi.bind(this),
      'experience --role=analyst':    this.cmdExpAnalyst.bind(this),
      'experience --role=finance':    this.cmdExpFinance.bind(this),
      help:  this.cmdHelp.bind(this),
      clear: this.cmdClear.bind(this),
      ls:    this.cmdLs.bind(this),
    };
  }

  init() {
    if (!this.container) return;
    this.buildUI();
    this.printWelcome();
  }

  buildUI() {
    this.container.innerHTML = `
      <div class="terminal-shell" id="skills-terminal-shell">
        <div class="terminal-header">
          <span class="terminal-dot terminal-dot-red"></span>
          <span class="terminal-dot terminal-dot-gold"></span>
          <span class="terminal-dot terminal-dot-green"></span>
          <span class="terminal-title">aaron@portfolio ~ /skills</span>
        </div>
        <div class="terminal-body" id="term-output"></div>
        <div class="terminal-input-row">
          <span class="terminal-prompt-symbol">
            <span class="terminal-dir">~/portfolio</span> $
          </span>
          <input
            id="term-input"
            class="terminal-input"
            type="text"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            placeholder="type a command…"
            aria-label="Terminal input"
          />
          <span class="terminal-cursor" aria-hidden="true"></span>
        </div>
      </div>
    `;

    this.output = document.getElementById('term-output');
    this.input  = document.getElementById('term-input');

    if (!this.input) return;

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleInput(this.input.value.trim());
        this.input.value = '';
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.histIdx < this.history.length - 1) {
          this.histIdx++;
          this.input.value = this.history[this.history.length - 1 - this.histIdx] || '';
        }
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.histIdx > 0) {
          this.histIdx--;
          this.input.value = this.history[this.history.length - 1 - this.histIdx] || '';
        } else {
          this.histIdx = -1;
          this.input.value = '';
        }
      }
    });
  }

  printWelcome() {
    const lines = [
      { text: '# Portfolio terminal — type help for commands', cls: 'terminal-line-comment' },
      { text: '', cls: '' },
    ];
    lines.forEach(l => this.printLine(l.text, l.cls));
  }

  printLine(text, cls = 'terminal-line-output') {
    if (!this.output) return;
    const span = document.createElement('span');
    span.className = `terminal-line ${cls}`;
    span.textContent = text;
    this.output.appendChild(span);
    this.output.scrollTop = this.output.scrollHeight;
  }

  printPrompt(cmd) {
    const line = document.createElement('span');
    line.className = 'terminal-line terminal-line-prompt';
    line.innerHTML = `<span class="terminal-dir">~/portfolio</span> $ ${this.escHtml(cmd)}`;
    this.output.appendChild(line);
    this.output.scrollTop = this.output.scrollHeight;
  }

  escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  async handleInput(raw) {
    if (!raw) return;
    if (this.isTyping) return;

    this.history.push(raw);
    this.histIdx = -1;

    this.printPrompt(raw);

    const cmd = raw.toLowerCase().trim();
    const handler = this.COMMANDS[cmd];

    if (handler) {
      await handler();
    } else {
      this.printLine(`command not found: ${raw}  (try 'help')`, 'terminal-line-error');
    }

    this.printLine('', '');
  }

  async typeLines(lines, delayMs = 18) {
    this.isTyping = true;
    for (const { text, cls } of lines) {
      await new Promise(resolve => {
        let i = 0;
        const span = document.createElement('span');
        span.className = `terminal-line ${cls || 'terminal-line-output'}`;
        this.output.appendChild(span);

        if (!text) {
          span.textContent = '';
          setTimeout(resolve, 30);
          return;
        }

        const iv = setInterval(() => {
          span.textContent += text[i];
          i++;
          this.output.scrollTop = this.output.scrollHeight;
          if (i >= text.length) {
            clearInterval(iv);
            setTimeout(resolve, 25);
          }
        }, delayMs);
      });
    }
    this.isTyping = false;
  }

  // ── Commands ─────────────────────────────────────────────

  async cmdWhoami() {
    await this.typeLines([
      { text: 'Aaron Paul Manalo Villanueva', cls: 'terminal-line-label' },
      { text: 'IS Graduate · West Visayas State University' },
      { text: 'Fintech & Data Engineering · Full-Stack Web & Mobile Developer' },
      { text: 'Seeking: Software Dev · Data Analytics · Fintech roles' },
    ]);
  }

  async cmdStack() {
    await this.typeLines([
      { text: '[Development]', cls: 'terminal-line-label' },
      { text: '  PHP · Python · JavaScript · Flutter/Dart · React · Next.js' },
      { text: '  TypeScript · Electron · HTML · CSS · Tailwind · Bootstrap' },
      { text: '', cls: '' },
      { text: '[Data & ML]', cls: 'terminal-line-label' },
      { text: '  scikit-learn · PyTorch · pandas · NumPy · statsmodels' },
      { text: '  Kafka · TimescaleDB · FastAPI · Streamlit · Power BI' },
      { text: '  Leaflet · Recharts · matplotlib · seaborn · MLflow' },
      { text: '', cls: '' },
      { text: '[Databases]', cls: 'terminal-line-label' },
      { text: '  MySQL · PostgreSQL · MariaDB · Supabase · Firebase' },
      { text: '', cls: '' },
      { text: '[Tools]', cls: 'terminal-line-label' },
      { text: '  Git · GitHub · Figma · Vite · MUI · Knex · GSAP · Lenis' },
    ]);
  }

  async cmdExpBi() {
    await this.typeLines([
      { text: 'Business Intelligence Intern', cls: 'terminal-line-label' },
      { text: 'Quirao Group of Companies — Jan 2026 to Apr 2026' },
      { text: 'Iloilo, Philippines (Onsite)' },
      { text: '' },
      { text: '  • Power BI dashboards & reporting systems' },
      { text: '  • ETL & data cleaning for operational datasets' },
      { text: '  • Cross-functional analytics integration' },
    ]);
  }

  async cmdExpAnalyst() {
    await this.typeLines([
      { text: 'Independent Data Analyst', cls: 'terminal-line-label' },
      { text: 'Self-Employed — Feb 2026 to May 2026 (Remote)' },
      { text: '' },
      { text: '  • EDA · ANOVA · Kruskal-Wallis · Regression (pandas, scipy)' },
      { text: '  • Custom visualizations, heatmaps, and boxplots' },
      { text: '  • Statistical reporting for research & business clients' },
    ]);
  }

  async cmdExpFinance() {
    await this.typeLines([
      { text: 'Financial Accounting & Auditing', cls: 'terminal-line-label' },
      { text: 'Splitscale Systems — Oct 2024 to Nov 2025 (Part-time)' },
      { text: '' },
      { text: '  • Financial records, auditing, and budget reports' },
      { text: '  • Data accuracy in accounting workflows' },
    ]);
  }

  async cmdHelp() {
    await this.typeLines([
      { text: 'Available commands:', cls: 'terminal-line-label' },
      { text: '  whoami                         — who I am' },
      { text: '  stack --list                   — full tech stack' },
      { text: '  experience --role=bi-intern    — BI internship details' },
      { text: '  experience --role=analyst      — freelance data analyst' },
      { text: '  experience --role=finance      — accounting role' },
      { text: '  ls                             — list sections' },
      { text: '  clear                          — clear terminal' },
    ]);
  }

  async cmdLs() {
    await this.typeLines([
      { text: 'about/     projects/     skills/     experience/     contact/' },
    ]);
  }

  cmdClear() {
    if (this.output) this.output.innerHTML = '';
    return Promise.resolve();
  }
}

/* ============================================================
   ScrollAnimator — GSAP section reveals
   ============================================================ */
class ScrollAnimator {
  constructor(selector) {
    this.selector = selector;
  }

  init() {
    if (prefersReducedMotion()) {
      document.querySelectorAll(this.selector).forEach(el =>
        el.classList.add('section-visible')
      );
      return;
    }

    const elements = document.querySelectorAll(this.selector);
    if (!elements.length) return;

    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      elements.forEach(el => el.classList.add('section-visible'));
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    elements.forEach(el => {
      gsap.fromTo(el,
        { opacity: 0, y: 24 },
        {
          scrollTrigger: { trigger: el, start: 'top 86%', once: true },
          opacity: 1,
          y: 0,
          duration: 0.85,
          ease: 'power3.out',
          clearProps: 'all',
        }
      );
    });
  }
}

/* ============================================================
   NavigationHighlighter
   ============================================================ */
class NavigationHighlighter {
  constructor(navSelector, sectionSelector) {
    this.navLinks = document.querySelectorAll(navSelector);
    this.sections = document.querySelectorAll(sectionSelector);
  }

  init() {
    if (!this.navLinks.length || !this.sections.length) return;
    window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
    this.handleScroll();
  }

  handleScroll() {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    let currentId = null;

    this.sections.forEach(section => {
      const offsetTop = section.getBoundingClientRect().top + scrollY - 120;
      if (scrollY >= offsetTop) currentId = section.id;
    });

    this.navLinks.forEach(link => {
      link.classList.remove('nav-link-active');
      if (currentId && link.getAttribute('href') === `#${currentId}`) {
        link.classList.add('nav-link-active');
      }
    });
  }
}

/* ============================================================
   ProjectDetailsModal
   ============================================================ */
class ProjectDetailsModal {
  constructor() {
    this.triggers = null;
    this.details = new Map();
    this.modal = null;
    this.modalTitle = null;
    this.modalBody = null;
    this.autoKeyCounter = 0;
  }

  init() {
    this.autoWireProjectCards();
    this.triggers = document.querySelectorAll('[data-project-open]');
    document.querySelectorAll('[data-project-details]').forEach(el => {
      const key = el.getAttribute('data-project-details');
      if (key) this.details.set(key, el);
    });
    if (!this.triggers.length || !this.details.size) return;
    this.createModal();
    this.bindTriggers();
  }

  autoWireProjectCards() {
    const cards = document.querySelectorAll('.project-card');
    cards.forEach(card => {
      const existingDetails = card.querySelector('[data-project-details]');
      const existingTrigger = card.querySelector('[data-project-open]');
      const titleEl = card.querySelector('h3, h4');
      const title = titleEl ? titleEl.textContent.trim() : 'Project Details';

      if (existingDetails && existingTrigger) {
        this.normalizeTrigger(existingTrigger);
        return;
      }

      let key;
      if (existingDetails) {
        key = existingDetails.getAttribute('data-project-details');
      } else {
        const footer = card.querySelector(':scope > div:last-of-type');
        key = `auto-card-${this.autoKeyCounter++}`;
        const generated = this.createAutoDetails(card, key, title);
        if (!generated) return;
        if (footer) card.insertBefore(generated, footer);
        else card.appendChild(generated);
      }

      this.injectTriggerButton(card, key);
    });
  }

  createAutoDetails(card, key, title) {
    const description = card.querySelector('.flex p, .flex-col p');
    const bullets = card.querySelector(':scope > ul');
    const techP = card.querySelector(':scope > div:last-of-type p');

    if (!bullets && !description) return null;

    const details = document.createElement('div');
    details.className = 'hidden';
    details.setAttribute('data-project-details', key);
    details.setAttribute('data-project-title', title);

    let html = '';
    if (description) {
      html += `<p class="text-[12px] text-slate-200 leading-relaxed">${description.innerHTML.trim()}</p>`;
    }
    if (bullets && bullets.innerHTML.trim()) {
      html += '<h4 class="mt-4 text-[10px] font-mono font-semibold uppercase tracking-[0.22em] text-portfolio-accent">Highlights</h4>';
      html += `<ul class="mt-2 space-y-2 text-[12px] text-slate-200 leading-relaxed">${bullets.innerHTML}</ul>`;
    }
    if (techP && techP.textContent.trim()) {
      html += '<h4 class="mt-4 text-[10px] font-mono font-semibold uppercase tracking-[0.22em] text-portfolio-accent">Tech Stack</h4>';
      html += `<p class="mt-2 text-[12px] text-slate-300 leading-relaxed">${techP.innerHTML.trim()}</p>`;
    }
    details.innerHTML = html;
    return details;
  }

  injectTriggerButton(card, key) {
    const footer = card.querySelector(':scope > div:last-of-type');
    if (!footer) return;
    if (footer.querySelector('[data-project-open]')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-project-open', key);
    this.normalizeTrigger(btn);
    footer.prepend(btn);
  }

  normalizeTrigger(trigger) {
    trigger.classList.add('project-details-trigger');
    if (!trigger.querySelector('span[aria-hidden="true"]')) {
      trigger.innerHTML = 'View details <span aria-hidden="true">→</span>';
    }
  }

  bindTriggers() {
    this.triggers.forEach(trigger => {
      trigger.addEventListener('click', () => {
        const key = trigger.getAttribute('data-project-open');
        this.open(key);
      });
    });
  }

  createModal() {
    const modal = document.createElement('div');
    modal.id = 'project-modal';
    modal.className = 'fixed inset-0 z-50 hidden items-center justify-center bg-black/0 p-4 md:p-8';
    modal.innerHTML = `
      <div class="project-modal-inner relative w-full max-h-[85vh] overflow-hidden">
        <button type="button" data-project-modal-close class="modal-close-btn" aria-label="Close modal">✕</button>
        <div class="flex flex-col gap-4 p-6 md:p-8 h-full">
          <h3 data-project-modal-title class="font-serif text-base md:text-lg font-normal text-portfolio-cream pr-10 leading-snug"></h3>
          <div data-project-modal-body class="modal-body flex-1 overflow-y-auto pr-1 text-[12.5px] text-slate-200/90 leading-relaxed"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;
    this.modalTitle = modal.querySelector('[data-project-modal-title]');
    this.modalBody  = modal.querySelector('[data-project-modal-body]');

    modal.querySelector('[data-project-modal-close]').addEventListener('click', () => this.close());
    modal.addEventListener('click', e => { if (e.target === modal) this.close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
  }

  open(key) {
    if (!this.modal || !key) return;
    const template = this.details.get(key);
    if (!template) return;

    const title = template.getAttribute('data-project-title') || 'Project details';
    if (this.modalTitle) this.modalTitle.textContent = title;
    this.modalBody.innerHTML = template.innerHTML;
    this.modal.classList.remove('hidden');
    this.modal.classList.add('flex');
    document.body.classList.add('modal-open');

    const inner = this.modal.querySelector('.project-modal-inner');
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(this.modal,
        { backgroundColor: 'rgba(0,0,0,0)' },
        { backgroundColor: 'rgba(0,0,0,0.75)', duration: 0.35, ease: 'power2.out' }
      );
      if (inner) {
        gsap.fromTo(inner,
          { opacity: 0, y: 24, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'power3.out', delay: 0.05 }
        );
      }
    } else if (inner) {
      inner.classList.remove('modal-animate-in', 'modal-animate-out');
      void inner.offsetWidth;
      inner.classList.add('modal-animate-in');
    }
  }

  close() {
    if (!this.modal) return;
    const inner = this.modal.querySelector('.project-modal-inner');
    const finish = () => {
      this.modal.classList.add('hidden');
      this.modal.classList.remove('flex');
      document.body.classList.remove('modal-open');
    };
    if (typeof gsap !== 'undefined') {
      const tl = gsap.timeline({ onComplete: finish });
      if (inner) tl.to(inner, { opacity: 0, y: 14, scale: 0.97, duration: 0.25, ease: 'power2.in' }, 0);
      tl.to(this.modal, { backgroundColor: 'rgba(0,0,0,0)', duration: 0.3, ease: 'power2.in' }, 0);
    } else if (inner) {
      inner.classList.remove('modal-animate-in');
      inner.classList.add('modal-animate-out');
      inner.addEventListener('animationend', () => {
        inner.classList.remove('modal-animate-out');
        finish();
      }, { once: true });
    } else {
      finish();
    }
  }
}

/* ============================================================
   ProjectFilterPaginator — with GSAP stagger on filter change
   ============================================================ */
class ProjectFilterPaginator {
  constructor() {
    this.PER_PAGE = 6;

    this.mainGrid   = document.getElementById('projects-grid');
    this.mainCards  = this.mainGrid
      ? Array.from(this.mainGrid.querySelectorAll('[data-project-tags]'))
      : [];

    this.addGrid    = document.getElementById('additional-grid');
    this.addCards   = this.addGrid
      ? Array.from(this.addGrid.querySelectorAll('[data-project-tags]'))
      : [];

    this.addWrapper = document.getElementById('additional-projects-wrapper');
    this.allCards   = [...this.mainCards, ...this.addCards];

    this.nav        = document.getElementById('projects-pagination');
    this.infoEl     = document.getElementById('projects-pagination-info');
    this.page       = 1;

    this.buttons     = document.querySelectorAll('[data-project-filter]');
    this.activeFilter = 'all';
  }

  init() {
    if (!this.buttons.length) return;
    this.buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeFilter = btn.getAttribute('data-project-filter') ?? 'all';
        this.page = 1;
        this.updateActiveButton(btn);
        this.render();
      });
    });
    this.render();
  }

  filtered(cards) {
    const f = this.activeFilter.toLowerCase();
    if (f === 'all') return cards;
    return cards.filter(card => {
      const tags = (card.getAttribute('data-project-tags') || '').toLowerCase();
      return tags.split(/\s+/).some(t => t && t === f);
    });
  }

  render() {
    if (!this.nav) return;

    const visible   = this.filtered(this.allCards);
    const total     = visible.length;
    const pages     = Math.max(1, Math.ceil(total / this.PER_PAGE));
    const page      = Math.min(this.page, pages);
    this.page       = page;
    const start     = (page - 1) * this.PER_PAGE;
    const end       = start + this.PER_PAGE;
    const pageCards = visible.slice(start, end);

    // Hide all, then show page cards with GSAP stagger if available
    const toShow = [];
    const toHide = [];

    this.allCards.forEach(card => {
      if (pageCards.includes(card)) toShow.push(card);
      else toHide.push(card);
    });

    toHide.forEach(card => {
      card.classList.add('hidden');
      card.classList.remove('cert-animate-in');
    });

    if (typeof gsap !== 'undefined' && !prefersReducedMotion()) {
      gsap.fromTo(toShow,
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: 'power2.out',
          clearProps: 'all',
          onStart: () => toShow.forEach(c => c.classList.remove('hidden')),
        }
      );
    } else {
      toShow.forEach(card => {
        card.classList.remove('hidden');
        card.classList.add('cert-animate-in');
      });
    }

    // Additional wrapper visibility
    if (this.addWrapper) {
      const hasVisibleAdd = pageCards.some(c => this.addCards.includes(c));
      this.addWrapper.classList.toggle('hidden', !hasVisibleAdd);
    }

    // Info text
    if (this.infoEl) {
      if (total === 0) {
        this.infoEl.textContent = 'No projects match this filter.';
      } else {
        const from = start + 1;
        const to   = Math.min(end, total);
        this.infoEl.textContent = `Showing ${from}–${to} of ${total} projects`;
      }
    }

    // Pagination buttons
    this.nav.innerHTML = '';
    if (pages <= 1) return;

    const makeBtn = (label, targetPage, isCurrent, isDisabled) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.disabled = isDisabled;
      btn.className = [
        'inline-flex items-center justify-center w-8 h-8 rounded-full text-[10px] font-mono font-semibold transition-all duration-150',
        isCurrent
          ? 'bg-portfolio-accent text-black shadow-md scale-105'
          : isDisabled
            ? 'text-slate-600 cursor-not-allowed'
            : 'text-slate-300 hover:bg-slate-800 hover:text-slate-50',
      ].join(' ');
      if (!isDisabled) {
        btn.addEventListener('click', () => {
          this.page = targetPage;
          this.render();
          const scrollTarget = this.mainGrid || document.getElementById('projects');
          if (scrollTarget) scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      return btn;
    };

    const delta = 2;
    this.nav.appendChild(makeBtn('←', page - 1, false, page === 1));
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || (i >= page - delta && i <= page + delta)) {
        this.nav.appendChild(makeBtn(String(i), i, i === page, false));
      } else if (i === page - delta - 1 || i === page + delta + 1) {
        const dots = document.createElement('span');
        dots.textContent = '…';
        dots.className = 'text-slate-500 text-[11px] px-1 font-mono';
        this.nav.appendChild(dots);
      }
    }
    this.nav.appendChild(makeBtn('→', page + 1, false, page === pages));
  }

  updateActiveButton(activeBtn) {
    this.buttons.forEach(btn => btn.classList.remove('project-filter-pill-active'));
    activeBtn.classList.add('project-filter-pill-active');
  }
}

/* ============================================================
   PortfolioApp — orchestrator
   ============================================================ */
class PortfolioApp {
  constructor() {
    this.heroCanvas      = new HeroCanvas('hero-canvas');
    this.heroReveal      = new HeroHeadlineReveal();
    this.lenis           = new LenisScroller();
    this.tiltCards       = new ProjectTiltCards();
    this.ndaDeclassify   = new NdaDeclassify();
    this.skillsTerminal  = new SkillsTerminal('skills-terminal-mount');
    this.scrollAnimator  = new ScrollAnimator('.section-observe');
    this.navHighlighter  = new NavigationHighlighter('header nav a', 'main section[id]');
    this.projectModal    = new ProjectDetailsModal();
    this.projectFilter   = new ProjectFilterPaginator();
  }

  init() {
    document.documentElement.classList.add('js-ready');

    // Lenis first — must be before GSAP ticker kicks in
    this.lenis.init();

    // Hero
    this.heroCanvas.init();
    this.heroReveal.init();

    // Card interactions
    this.tiltCards.init();
    this.ndaDeclassify.init();

    // Skills terminal
    this.skillsTerminal.init();

    // Scroll + nav
    this.scrollAnimator.init();
    this.navHighlighter.init();

    // Projects
    this.projectModal.init();
    this.projectFilter.init();

    this.setCurrentYear();

    const cardCount   = document.querySelectorAll('[data-project-tags]').length;
    const filterCount = document.querySelectorAll('[data-project-filter]').length;
    console.info(
      `[portfolio] ready — ${cardCount} project cards, ${filterCount} filters, all modules initialized`
    );
  }

  setCurrentYear() {
    const el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear().toString();
  }
}

/* ============================================================
   Boot
   ============================================================ */
function bootPortfolio() {
  try {
    const app = new PortfolioApp();
    app.init();
  } catch (err) {
    console.error('[portfolio] initialization failed:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootPortfolio);
} else {
  bootPortfolio();
}
