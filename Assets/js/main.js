// @js
// Main portfolio script using a simple OOP structure.

console.info('[portfolio] main.js loaded — initializing UI');

class ScrollAnimator {
  constructor(selector, options = {}) {
    this.selector = selector;
    // threshold: 0 means "trigger as soon as ANY pixel is visible".
    // Using 0.2 (20%) breaks for sections taller than the viewport,
    // because the threshold can never be reached.
    this.threshold = options.threshold ?? 0;
    this.rootMargin = options.rootMargin ?? '0px 0px -60px 0px';
    this.observer = null;
  }

  init() {
    const elements = document.querySelectorAll(this.selector);
    if (elements.length === 0) {
      console.info('[portfolio] ScrollAnimator: no .section-observe elements');
      return;
    }

    if (!('IntersectionObserver' in window)) {
      // Fallback for ancient browsers: just show everything immediately.
      console.info('[portfolio] IntersectionObserver unsupported, revealing all sections');
      elements.forEach((el) => el.classList.add('section-visible'));
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('section-visible');
            this.observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: this.threshold,
        rootMargin: this.rootMargin,
      }
    );

    elements.forEach((el) => this.observer.observe(el));

    // Defensive fallback: if for any reason a section doesn't get marked
    // visible within 1.5s (e.g. page restored from bfcache, observer not
    // firing on the very first paint), force them all visible so the
    // page never stays blank.
    setTimeout(() => {
      document.querySelectorAll(this.selector).forEach((el) => {
        if (!el.classList.contains('section-visible')) {
          el.classList.add('section-visible');
        }
      });
    }, 1500);
  }
}

class NavigationHighlighter {
  constructor(navSelector, sectionSelector) {
    this.navLinks = document.querySelectorAll(navSelector);
    this.sections = document.querySelectorAll(sectionSelector);
  }

  init() {
    if (!this.navLinks.length || !this.sections.length) return;

    window.addEventListener('scroll', () => this.handleScroll());
    this.handleScroll();
  }

  handleScroll() {
    const scrollPosition =
      window.scrollY || window.pageYOffset || document.documentElement.scrollTop;

    let currentId = null;
    this.sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const offsetTop = rect.top + scrollPosition - 120;
      if (scrollPosition >= offsetTop) {
        currentId = section.id;
      }
    });

    this.navLinks.forEach((link) => {
      link.classList.remove('nav-link-active');
      const href = link.getAttribute('href');
      if (currentId && href === `#${currentId}`) {
        link.classList.add('nav-link-active');
      }
    });
  }
}

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
    // Auto-wire every project card: ensure each has a details container and
    // a "View details" trigger button so cards can stay visually compact
    // (image + title + 1-2 line description + action) while the bullet
    // content lives inside the modal.
    this.autoWireProjectCards();

    // (Re)collect all triggers and details now that auto-injection is done.
    this.triggers = document.querySelectorAll('[data-project-open]');
    document.querySelectorAll('[data-project-details]').forEach((el) => {
      const key = el.getAttribute('data-project-details');
      if (key) this.details.set(key, el);
    });

    if (!this.triggers.length || !this.details.size) return;

    this.createModal();
    this.bindTriggers();
  }

  /**
   * Walk every .project-card and make sure it has both a details data
   * container and a trigger button. Cards that already had hand-written
   * data-project-details / data-project-open attributes are left alone
   * (we only normalize their button class).
   */
  autoWireProjectCards() {
    const cards = document.querySelectorAll('.project-card');
    cards.forEach((card) => {
      const existingDetails = card.querySelector('[data-project-details]');
      const existingTrigger = card.querySelector('[data-project-open]');

      const titleEl = card.querySelector('h3, h4');
      const title = titleEl ? titleEl.textContent.trim() : 'Project Details';

      // Already fully wired — just normalize the trigger style/label and bail.
      if (existingDetails && existingTrigger) {
        this.normalizeTrigger(existingTrigger);
        return;
      }

      let key;
      if (existingDetails) {
        key = existingDetails.getAttribute('data-project-details');
      } else {
        // Locate the footer (the last :scope > div) BEFORE inserting the
        // generated details container; otherwise our newly appended div
        // becomes :last-of-type and the trigger ends up in the wrong place.
        const footer = card.querySelector(':scope > div:last-of-type');
        key = `auto-card-${this.autoKeyCounter++}`;
        const generated = this.createAutoDetails(card, key, title);
        if (!generated) return;
        if (footer) {
          card.insertBefore(generated, footer);
        } else {
          card.appendChild(generated);
        }
      }

      this.injectTriggerButton(card, key);
    });
  }

  /**
   * Generate a hidden data-project-details container by harvesting the
   * card's own description, bullet list, and verbose tech-stack line.
   */
  createAutoDetails(card, key, title) {
    const description = card.querySelector('.flex.items-start p');
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
      html +=
        '<h4 class="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-portfolio-accent">Highlights</h4>';
      html += `<ul class="mt-2 space-y-2 text-[12px] text-slate-200 leading-relaxed">${bullets.innerHTML}</ul>`;
    }
    if (techP && techP.textContent.trim()) {
      html +=
        '<h4 class="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-portfolio-accent">Tech Stack</h4>';
      html += `<p class="mt-2 text-[12px] text-slate-300 leading-relaxed">${techP.innerHTML.trim()}</p>`;
    }
    details.innerHTML = html;
    return details;
  }

  /**
   * Insert a "View details →" button into the card's footer (the last
   * direct-child div), positioned at the start so external links can
   * stay on the right side.
   */
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

  /**
   * Standardize any "View details" trigger so they all look the same:
   * the .project-details-trigger class for styling, "View details" label,
   * and an arrow span that animates on hover.
   */
  normalizeTrigger(trigger) {
    trigger.classList.add('project-details-trigger');
    if (!trigger.querySelector('span[aria-hidden="true"]')) {
      trigger.innerHTML = 'View details <span aria-hidden="true">→</span>';
    }
  }

  bindTriggers() {
    this.triggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const key = trigger.getAttribute('data-project-open');
        this.open(key);
      });
    });
  }

  createModal() {
    const modal = document.createElement('div');
    modal.id = 'project-modal';
    modal.className =
      'fixed inset-0 z-50 hidden items-center justify-center bg-black/70 p-4';
    modal.innerHTML = `
      <div class="project-modal-inner relative max-w-3xl w-full max-h-[80vh] overflow-hidden rounded-2xl bg-slate-950 border border-slate-700/80 shadow-2xl">
        <button type="button" data-project-modal-close
          class="absolute right-3 top-3 rounded-full bg-slate-800/80 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700">
          ✕
        </button>
        <div class="flex flex-col gap-3 p-4 md:p-6 h-full">
          <h3 data-project-modal-title class="text-sm font-semibold text-slate-50"></h3>
          <div data-project-modal-body class="flex-1 overflow-y-auto pr-1 text-[11px] text-slate-200 leading-relaxed"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;
    this.modalTitle = modal.querySelector('[data-project-modal-title]');
    this.modalBody = modal.querySelector('[data-project-modal-body]');

    const closeBtn = modal.querySelector('[data-project-modal-close]');
    closeBtn.addEventListener('click', () => this.close());
    modal.addEventListener('click', (event) => {
      if (event.target === modal) this.close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.close();
    });
  }

  open(key) {
    if (!this.modal || !this.modalBody || !key) return;

    const template = this.details.get(key);
    if (!template) return;

    const title =
      template.getAttribute('data-project-title') || 'Project details';
    if (this.modalTitle) {
      this.modalTitle.textContent = title;
    }

    this.modalBody.innerHTML = template.innerHTML;
    this.modal.classList.remove('hidden');
    this.modal.classList.add('flex');

    const inner = this.modal.querySelector('.project-modal-inner');
    if (inner) {
      inner.classList.remove('modal-animate-in', 'modal-animate-out');
      // eslint-disable-next-line no-unused-expressions
      inner.offsetWidth;
      inner.classList.add('modal-animate-in');
    }
  }

  close() {
    if (!this.modal) return;

    const inner = this.modal.querySelector('.project-modal-inner');
    if (inner) {
      inner.classList.remove('modal-animate-in');
      inner.classList.add('modal-animate-out');

      const handleEnd = () => {
        inner.removeEventListener('animationend', handleEnd);
        inner.classList.remove('modal-animate-out');
        this.modal.classList.add('hidden');
        this.modal.classList.remove('flex');
      };

      inner.addEventListener('animationend', handleEnd);
    } else {
      this.modal.classList.add('hidden');
      this.modal.classList.remove('flex');
    }
  }
}

class ProjectFilterPaginator {
  constructor() {
    this.PER_PAGE = 6;

    // --- Main grid ---
    this.mainGrid      = document.getElementById('projects-grid');
    this.mainCards     = this.mainGrid
      ? Array.from(this.mainGrid.querySelectorAll('[data-project-tags]'))
      : [];

    // --- Additional grid ---
    this.addGrid       = document.getElementById('additional-grid');
    this.addCards      = this.addGrid
      ? Array.from(this.addGrid.querySelectorAll('[data-project-tags]'))
      : [];

    // Additional projects wrapper (to show/hide)
    this.addWrapper    = document.getElementById('additional-projects-wrapper');

    // Combine them into a single list
    this.allCards      = [...this.mainCards, ...this.addCards];

    // Single unified pagination controls
    this.nav           = document.getElementById('projects-pagination');
    this.infoEl        = document.getElementById('projects-pagination-info');
    this.page          = 1;

    // Filter buttons (shared)
    this.buttons       = document.querySelectorAll('[data-project-filter]');
    this.activeFilter  = 'all';
  }

  init() {
    if (!this.buttons.length) return;

    this.buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeFilter = btn.getAttribute('data-project-filter') ?? 'all';
        this.page = 1;
        this.updateActiveButton(btn);
        this.render();
      });
    });

    this.render();
  }

  /** Returns only the cards that pass the current filter. */
  filtered(cards) {
    const f = this.activeFilter.toLowerCase();
    if (f === 'all') return cards;
    return cards.filter((card) => {
      const tags = (card.getAttribute('data-project-tags') || '').toLowerCase();
      return tags.split(/\s+/).some((t) => t && t === f);
    });
  }

  /** Render grids and unified pagination. */
  render() {
    if (!this.nav) return;

    const visible  = this.filtered(this.allCards);
    const total    = visible.length;
    const pages    = Math.max(1, Math.ceil(total / this.PER_PAGE));
    const page     = Math.min(this.page, pages);
    this.page      = page;
    const start    = (page - 1) * this.PER_PAGE;
    const end      = start + this.PER_PAGE;

    // Get the slice of cards to display on this page
    const pageCards = visible.slice(start, end);

    // Show/hide all cards based on whether they are on this page
    this.allCards.forEach((card) => {
      if (pageCards.includes(card)) {
        card.classList.remove('hidden');
        card.classList.add('cert-animate-in');
      } else {
        card.classList.add('hidden');
        card.classList.remove('cert-animate-in');
      }
    });

    // Control visibility of additional projects wrapper section
    if (this.addWrapper) {
      const hasVisibleAdditional = pageCards.some((card) => this.addCards.includes(card));
      if (hasVisibleAdditional) {
        this.addWrapper.classList.remove('hidden');
      } else {
        this.addWrapper.classList.add('hidden');
      }
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
        'inline-flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-semibold transition-all duration-150',
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
          // Smooth scroll to the top of the main projects section or grid
          const scrollTarget = this.mainGrid || document.getElementById('projects');
          if (scrollTarget) {
            scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }
      return btn;
    };

    // ← Prev
    this.nav.appendChild(makeBtn('←', page - 1, false, page === 1));

    // Numbered pages (show at most 5 around current)
    const delta = 2;
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || (i >= page - delta && i <= page + delta)) {
        this.nav.appendChild(makeBtn(String(i), i, i === page, false));
      } else if (i === page - delta - 1 || i === page + delta + 1) {
        const dots = document.createElement('span');
        dots.textContent = '…';
        dots.className = 'text-slate-500 text-[11px] px-1';
        this.nav.appendChild(dots);
      }
    }

    // → Next
    this.nav.appendChild(makeBtn('→', page + 1, false, page === pages));
  }

  updateActiveButton(activeBtn) {
    this.buttons.forEach((btn) => btn.classList.remove('project-filter-pill-active'));
    activeBtn.classList.add('project-filter-pill-active');
  }
}


class PortfolioApp {
  constructor() {
    this.scrollAnimator = new ScrollAnimator('.section-observe');
    this.navHighlighter = new NavigationHighlighter(
      'header nav a',
      'main section[id]'
    );
    this.projectDetailsModal = new ProjectDetailsModal();
    this.projectFilter = new ProjectFilterPaginator();
  }

  init() {
    // Mark the document as JS-ready BEFORE running any scroll animations so
    // CSS can switch sections from "always visible" to "fade-in on scroll".
    document.documentElement.classList.add('js-ready');

    this.scrollAnimator.init();
    this.navHighlighter.init();
    this.projectDetailsModal.init();
    this.projectFilter.init();
    this.setCurrentYear();

    const cardCount = document.querySelectorAll('[data-project-tags]').length;
    const filterCount = document.querySelectorAll('[data-project-filter]').length;
    console.info(
      `[portfolio] ready — ${cardCount} project cards, ${filterCount} filters, pagination enabled`
    );
  }

  setCurrentYear() {
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear().toString();
    }
  }
}

// Initialize the portfolio when DOM is ready.
// If `defer` already kicked in and DOM is past loading, run immediately.
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

/**
 * External libraries & configuration:
 * - Tailwind CSS is precompiled by the Tailwind CLI from
 *   Assets/css/source.css into Assets/css/main.css.
 *   See package.json (`build:css` / `watch:css`) and tailwind.config.js
 *   for the build setup and the custom `portfolio` palette.
 *
 * This file focuses only on interaction logic and scroll animations.
 */


