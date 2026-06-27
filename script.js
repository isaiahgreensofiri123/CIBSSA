/**
 * ============================================================
 *  CIBSSA Constitution – Interactive App Script
 *  Cinematography & Broadcast Studies Student's Association
 * ============================================================
 *  Vanilla JavaScript – no frameworks, no jQuery.
 *  Features:
 *    1.  Dark / Light mode toggle (persisted)
 *    2.  Sidebar table-of-contents (auto-generated & route-aware)
 *    3.  Full-text search with highlighting
 *    4.  Single-Page App Router (Section-by-section view)
 *    5.  Dynamic Directory Dashboard
 *    6.  Reader Header and Pagination controls (Prev / Next)
 *    7.  Back-to-top button
 *    8.  Reading progress bar
 *    9.  Scroll-reveal animations
 *   10.  Print button
 *   11.  Font-size controls (persisted)
 *   12.  Mobile responsive navigation
 * ============================================================
 */

;(function () {
  'use strict';

  /* ──────────────────────────────────────────────
   *  0. UTILITY HELPERS
   * ────────────────────────────────────────────── */

  function debounce(fn, wait) {
    let timer;
    return function () {
      const context = this;
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, wait);
    };
  }

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $$(selector, scope) {
    return Array.from((scope || document).querySelectorAll(selector));
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /* ──────────────────────────────────────────────
   *  1. DARK / LIGHT MODE TOGGLE
   * ────────────────────────────────────────────── */

  const DarkMode = {
    STORAGE_KEY: 'cibssa-dark-mode',
    body: document.body,

    init: function () {
      const toggle = $('#themeToggle');
      if (!toggle) return;

      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored === 'true') {
        this.enable();
      } else if (stored === 'false') {
        this.disable();
      } else {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          this.enable();
        }
      }

      toggle.addEventListener('click', function () {
        DarkMode.toggle();
      });
    },

    enable: function () {
      this.body.classList.add('dark-mode');
      this.body.classList.remove('light-mode');
      localStorage.setItem(this.STORAGE_KEY, 'true');
    },

    disable: function () {
      this.body.classList.remove('dark-mode');
      this.body.classList.add('light-mode');
      localStorage.setItem(this.STORAGE_KEY, 'false');
    },

    toggle: function () {
      if (this.body.classList.contains('dark-mode')) {
        this.disable();
      } else {
        this.enable();
      }
    }
  };

  /* ──────────────────────────────────────────────
   *  2. SIDEBAR NAVIGATION (Table of Contents)
   * ────────────────────────────────────────────── */

  const Sidebar = {
    container: null,
    tocNav: null,
    observer: null,
    headingMap: [],

    init: function () {
      this.container = $('#sidebar');
      this.tocNav = $('#tocNav');
      if (!this.container || !this.tocNav) return;

      this._buildTOC();
      this._bindMobileToggle();
    },

    _buildTOC: function () {
      const articles = $$('article.constitution-article');
      
      const ul = document.createElement('ul');
      ul.classList.add('toc-list');

      // Add a Home Link in sidebar TOC
      const homeLi = document.createElement('li');
      homeLi.classList.add('toc-item');
      const homeA = document.createElement('a');
      homeA.href = '#home';
      homeA.classList.add('toc-link');
      homeA.innerHTML = '<span class="toc-number">🏠</span> Home Directory';
      homeA.addEventListener('click', () => {
        Sidebar._closeMobile();
      });
      homeLi.appendChild(homeA);
      ul.appendChild(homeLi);

      articles.forEach((article) => {
        const heading = $('h2.article-title', article);
        if (!heading) return;

        const articleId = article.id;
        const numberSpan = $('.article-number', heading);
        const articleNumber = numberSpan ? numberSpan.textContent.trim() : '';
        const articleCleanTitle = heading.textContent
          .replace(articleNumber, '')
          .replace('📜', '')
          .replace('✍️', '')
          .replace('📖', '')
          .trim();

        const li = document.createElement('li');
        li.classList.add('toc-item', 'toc-article');

        const a = document.createElement('a');
        a.href = '#' + articleId;
        a.classList.add('toc-link');
        
        const numBadge = document.createElement('span');
        numBadge.classList.add('toc-number');
        numBadge.textContent = articleNumber ? articleNumber.replace('Article ', '') : '📜';
        
        a.appendChild(numBadge);
        a.appendChild(document.createTextNode(' ' + articleCleanTitle));
        li.appendChild(a);

        this.headingMap.push({ id: articleId, tocLink: a });

        // Sub-sections inside this article
        const sections = $$('section.constitution-section', article);
        if (sections.length) {
          const subUl = document.createElement('ul');
          subUl.classList.add('toc-sub-list');
          subUl.style.listStyle = 'none';

          sections.forEach((sec) => {
            const secHeading = $('h3.section-title', sec);
            if (!secHeading) return;

            const secId = sec.id;
            const secTitle = secHeading.textContent.trim();

            const subLi = document.createElement('li');
            subLi.classList.add('toc-item', 'toc-section');

            const subA = document.createElement('a');
            subA.href = '#' + secId;
            subA.classList.add('toc-link');
            subA.setAttribute('data-level', '2');
            subA.textContent = secTitle;
            
            subLi.appendChild(subA);
            subUl.appendChild(subLi);

            this.headingMap.push({ id: secId, tocLink: subA });

            subA.addEventListener('click', () => {
              Sidebar._closeMobile();
            });
          });

          li.appendChild(subUl);
        }

        a.addEventListener('click', () => {
          Sidebar._closeMobile();
        });

        ul.appendChild(li);
      });

      this.tocNav.appendChild(ul);
    },

    _bindMobileToggle: function () {
      const hamburger = $('#hamburger');
      const overlay = $('#sidebarOverlay');

      if (hamburger) {
        hamburger.addEventListener('click', () => {
          this._toggleMobile();
        });
      }
      if (overlay) {
        overlay.addEventListener('click', () => {
          this._closeMobile();
        });
      }
    },

    _toggleMobile: function () {
      if (this.container) this.container.classList.toggle('open');
      const overlay = $('#sidebarOverlay');
      if (overlay) overlay.classList.toggle('visible');
      const hamburger = $('#hamburger');
      if (hamburger) hamburger.classList.toggle('active');
    },

    _closeMobile: function () {
      if (this.container) this.container.classList.remove('open');
      const overlay = $('#sidebarOverlay');
      if (overlay) overlay.classList.remove('visible');
      const hamburger = $('#hamburger');
      if (hamburger) hamburger.classList.remove('active');
    }
  };

  /* ──────────────────────────────────────────────
   *  3. APP ROUTER (Section-by-Section navigation)
   * ────────────────────────────────────────────── */

  const AppRouter = {
    ROUTE_ITEMS: [
      'preamble',
      'article-1',
      'article-2',
      'article-3',
      'article-4',
      'article-5',
      'article-6',
      'article-7',
      'article-8',
      'article-9',
      'article-10',
      'article-11',
      'article-12',
      'assent',
      'appendices'
    ],

    init: function () {
      this.dashboard = $('#appDashboard');
      this.readerHeader = $('#readerHeader');
      this.readerFooter = $('#readerFooter');
      this.prevBtn = $('#prevSectionBtn');
      this.nextBtn = $('#nextSectionBtn');
      this.backBtn = $('#backToDirBtn');
      this.currentItemLabel = $('#readerCurrentItem');
      this.hero = $('#hero');

      // Generate dashboard cards
      this._generateDashboard();

      // Listen to Hash Changes
      window.addEventListener('hashchange', () => {
        this.handleRoute();
      });

      // Back to directory button
      if (this.backBtn) {
        this.backBtn.addEventListener('click', () => {
          window.location.hash = 'home';
        });
      }

      // Prev / Next buttons
      if (this.prevBtn) {
        this.prevBtn.addEventListener('click', () => {
          this.navigate(-1);
        });
      }
      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', () => {
          this.navigate(1);
        });
      }

      // Handle initial load route
      this.handleRoute();
    },

    _generateDashboard: function () {
      const grid = $('#dashboardGrid');
      if (!grid) return;

      grid.innerHTML = '';

      const items = [
        { id: 'preamble', num: 'Intro', title: 'Preamble', desc: 'The founding declaration, supreme status, and binding force of the CIBSSA constitution.' },
        { id: 'article-1', num: 'Article 1', title: 'General Provisions', desc: 'Definitions of key terms, official name, motto, core principles, and aims of CIBSSA.' },
        { id: 'article-2', num: 'Article 2', title: 'Membership & Privileges', desc: 'Rules for ordinary and honorary membership, rights, and duties of CIBSSA members.' },
        { id: 'article-3', num: 'Article 3', title: 'Constituent Bodies', desc: 'Structure of the association: Executive Council, Representative Council, and Congress.' },
        { id: 'article-4', num: 'Article 4', title: 'Functions & Meetings', desc: 'Legislative powers, executive functions, meeting rules, mace, and quorum details.' },
        { id: 'article-5', num: 'Article 5', title: 'Duties of Officers', desc: 'Specific roles and responsibilities from President and Speaker to Chief Whip and Clerk.' },
        { id: 'article-6', num: 'Article 6', title: 'Order of Precedence', desc: 'The official protocol and hierarchy of positions within the association.' },
        { id: 'article-7', num: 'Article 7', title: 'Advisory Committee & Patrons', desc: 'The Board of Elders (emeritus leaders), Staff Adviser, and Grand Patrons/Matrons.' },
        { id: 'article-8', num: 'Article 8', title: 'Constitution & Elections', desc: 'Electoral committee, candidate requirements, GPAs, and amendment guidelines.' },
        { id: 'article-9', num: 'Article 9', title: 'Finance, Budgets & Projects', desc: 'Allocation percentages (70% Executive, 20% CRC, 10% Advisory) and dues.' },
        { id: 'article-10', num: 'Article 10', title: 'Appointments & Committees', desc: 'Presidential appointments (Chief of Staff, Press Sec) and standing committees.' },
        { id: 'article-11', num: 'Article 11', title: 'Inauguration & Activities', desc: 'Transition timeline, academic programs, and political consciousness.' },
        { id: 'article-12', num: 'Article 12', title: 'Impeachment & Resignation', desc: 'Rules for disciplinary actions, suspensions, and official resignations.' },
        { id: 'assent', num: 'Sign-Off', title: 'Assent & Citation', desc: 'The official review signatures, citation name, and date of commencement.' },
        { id: 'appendices', num: 'Oaths', title: 'Appendices', desc: 'Solemn oaths of allegiance and office for the Executives and CRC.' }
      ];

      items.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'dashboard-card';
        card.innerHTML = `
          <div>
            <div class="dashboard-card-num">${item.num}</div>
            <h3 class="dashboard-card-title">${item.title}</h3>
            <p class="dashboard-card-desc">${item.desc}</p>
          </div>
          <div class="dashboard-card-action">
            Read Section
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </div>
        `;
        card.addEventListener('click', () => {
          window.location.hash = item.id;
        });
        grid.appendChild(card);
      });
    },

    handleRoute: function () {
      const hash = window.location.hash.slice(1) || 'home';
      
      let activeArticleId = '';
      let targetSectionId = '';

      if (hash === 'home' || hash === '') {
        document.body.classList.remove('app-view-active');
        if (this.dashboard) this.dashboard.style.display = 'block';
        if (this.hero) this.hero.style.display = 'block';
        if (this.readerHeader) this.readerHeader.style.display = 'none';
        if (this.readerFooter) this.readerFooter.style.display = 'none';

        $$('.constitution-article').forEach(el => el.classList.remove('active-article'));
        $$('.toc-link').forEach(link => {
          if (link.getAttribute('href') === '#home') {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
        
        if (typeof MobileTabs !== 'undefined') {
          MobileTabs.updateActive('home');
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
        return;
      }

      // Route checks
      if (this.ROUTE_ITEMS.includes(hash)) {
        activeArticleId = hash;
      } else {
        const sectionEl = document.getElementById(hash);
        if (sectionEl) {
          targetSectionId = hash;
          const parentArticle = sectionEl.closest('.constitution-article');
          if (parentArticle) {
            activeArticleId = parentArticle.id;
          }
        }
      }

      if (!activeArticleId) {
        window.location.hash = 'home';
        return;
      }

      // App view active states
      document.body.classList.add('app-view-active');
      if (this.dashboard) this.dashboard.style.display = 'none';
      if (this.hero) this.hero.style.display = 'none';
      if (this.readerHeader) this.readerHeader.style.display = 'flex';
      if (this.readerFooter) this.readerFooter.style.display = 'flex';

      // Set active article
      $$('.constitution-article').forEach((el) => {
        if (el.id === activeArticleId) {
          el.classList.add('active-article');
        } else {
          el.classList.remove('active-article');
        }
      });

      // Update Reader Header Current Title
      const articleEl = document.getElementById(activeArticleId);
      const titleEl = $('h2.article-title', articleEl);
      if (this.currentItemLabel && titleEl) {
        const numSpan = $('.article-number', titleEl);
        const articleNumber = numSpan ? numSpan.textContent.trim() : '';
        this.currentItemLabel.textContent = titleEl.textContent
          .replace(articleNumber, '')
          .replace('📜', '')
          .replace('✍️', '')
          .replace('📖', '')
          .trim();
      }

      // Pagination active states
      const currentIndex = this.ROUTE_ITEMS.indexOf(activeArticleId);
      if (this.prevBtn) this.prevBtn.disabled = currentIndex <= 0;
      if (this.nextBtn) this.nextBtn.disabled = currentIndex >= this.ROUTE_ITEMS.length - 1;

      // Update TOC sidebar active state
      $$('.toc-link').forEach((link) => {
        const linkHash = link.getAttribute('href').slice(1);
        if (linkHash === hash || linkHash === activeArticleId) {
          link.classList.add('active');
          const parentLi = link.closest('.toc-article');
          if (parentLi) parentLi.classList.remove('collapsed');
        } else {
          link.classList.remove('active');
        }
      });

      // Scroll view logic
      if (targetSectionId) {
        const secEl = document.getElementById(targetSectionId);
        if (secEl) {
          setTimeout(() => {
            const headerOffset = 90;
            const top = secEl.getBoundingClientRect().top + window.pageYOffset - headerOffset;
            window.scrollTo({ top: top, behavior: 'smooth' });
          }, 100);
        }
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }

      if (typeof MobileTabs !== 'undefined') {
        MobileTabs.updateActive(activeArticleId);
      }
    },

    navigate: function (direction) {
      const hash = window.location.hash.slice(1);
      let activeArticleId = '';

      if (this.ROUTE_ITEMS.includes(hash)) {
        activeArticleId = hash;
      } else {
        const sectionEl = document.getElementById(hash);
        if (sectionEl) {
          const parentArticle = sectionEl.closest('.constitution-article');
          if (parentArticle) activeArticleId = parentArticle.id;
        }
      }

      const currentIndex = this.ROUTE_ITEMS.indexOf(activeArticleId);
      const nextIndex = currentIndex + direction;

      if (nextIndex >= 0 && nextIndex < this.ROUTE_ITEMS.length) {
        window.location.hash = this.ROUTE_ITEMS[nextIndex];
      }
    }
  };

  /* ──────────────────────────────────────────────
   *  4. SEARCH FUNCTIONALITY
   * ────────────────────────────────────────────── */

  const Search = {
    input: null,
    clearBtn: null,
    resultsContainer: null,
    resultCount: null,
    _allSections: [],

    init: function () {
      this.input = $('#searchInput');
      this.clearBtn = $('#searchClear');
      this.resultsContainer = $('#searchResultsDropdown');
      this.resultCount = $('#searchResultsCount');
      if (!this.input) return;

      this._cacheContent();

      this.input.addEventListener('input', debounce(function () {
        Search._performSearch(Search.input.value.trim());
      }, 300));

      if (this.clearBtn) {
        this.clearBtn.addEventListener('click', function () {
          Search.input.value = '';
          Search._clearResults();
          Search.input.focus();
        });
      }

      document.addEventListener('click', function (e) {
        if (Search.resultsContainer && !Search.resultsContainer.contains(e.target) && e.target !== Search.input) {
          Search.resultsContainer.classList.remove('open');
        }
      });

      this.input.addEventListener('focus', function () {
        if (Search.input.value.trim().length >= 2 && Search.resultsContainer) {
          Search.resultsContainer.classList.add('open');
        }
      });
    },

    _cacheContent: function () {
      const blocks = $$('article.constitution-article, section.constitution-section');
      blocks.forEach((block) => {
        const heading = $('h2, h3', block);
        const headingText = heading ? heading.textContent.trim() : '';
        const bodyText = block.textContent.trim();
        const id = block.id;

        Search._allSections.push({
          heading: headingText,
          text: bodyText,
          id: id,
          el: block
        });
      });
    },

    _performSearch: function (query) {
      if (query.length < 2) {
        this._clearResults();
        return;
      }

      if (this.clearBtn) this.clearBtn.classList.add('visible');

      const regex = new RegExp('(' + escapeRegex(query) + ')', 'gi');
      const matches = [];

      this._allSections.forEach(function (section) {
        if (regex.test(section.text)) {
          const idx = section.text.toLowerCase().indexOf(query.toLowerCase());
          const start = Math.max(0, idx - 40);
          const end = Math.min(section.text.length, idx + query.length + 80);
          const snippet = (start > 0 ? '…' : '') +
                          section.text.substring(start, end).replace(regex, '<mark class="search-highlight">$1</mark>') +
                          (end < section.text.length ? '…' : '');

          matches.push({
            heading: section.heading.replace('📜', '').replace('✍️', '').replace('📖', '').trim(),
            snippet: snippet,
            id: section.id,
            el: section.el
          });
        }
      });

      this._renderResults(matches, query);
    },

    _renderResults: function (matches, query) {
      if (!this.resultsContainer) return;

      this.resultsContainer.innerHTML = '';

      if (matches.length === 0) {
        this.resultsContainer.innerHTML = '<div class="search-result-no-results">No results found for "<strong>' + escapeRegex(query) + '</strong>"</div>';
        this.resultsContainer.classList.add('open');
        if (this.resultCount) this.resultCount.textContent = '0 results';
        return;
      }

      if (this.resultCount) {
        this.resultCount.textContent = matches.length + ' result' + (matches.length !== 1 ? 's' : '');
      }

      matches.forEach((m) => {
        const item = document.createElement('div');
        item.classList.add('search-result-item');
        item.innerHTML =
          '<div class="search-result-title">' + m.heading + '</div>' +
          '<div class="search-result-snippet">' + m.snippet + '</div>';

        item.addEventListener('click', function () {
          window.location.hash = m.id;
          Search.resultsContainer.classList.remove('open');
          Sidebar._closeMobile();
        });

        Search.resultsContainer.appendChild(item);
      });

      this.resultsContainer.classList.add('open');
    },

    _clearResults: function () {
      if (this.resultsContainer) {
        this.resultsContainer.innerHTML = '';
        this.resultsContainer.classList.remove('open');
      }
      if (this.clearBtn) this.clearBtn.classList.remove('visible');
      if (this.resultCount) this.resultCount.textContent = '';
    }
  };

  /* ──────────────────────────────────────────────
   *  5. BACK-TO-TOP BUTTON
   * ────────────────────────────────────────────── */

  const BackToTop = {
    btn: null,
    SCROLL_THRESHOLD: 300,

    init: function () {
      this.btn = $('#backToTop');
      if (!this.btn) return;

      window.addEventListener('scroll', function () {
        if (window.pageYOffset > BackToTop.SCROLL_THRESHOLD) {
          BackToTop.btn.classList.add('visible');
        } else {
          BackToTop.btn.classList.remove('visible');
        }
      }, { passive: true });

      this.btn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  };

  /* ──────────────────────────────────────────────
   *  6. READING PROGRESS BAR
   * ────────────────────────────────────────────── */

  const ProgressBar = {
    bar: null,

    init: function () {
      this.bar = $('#progressBar');
      if (!this.bar) return;

      window.addEventListener('scroll', function () {
        ProgressBar._update();
      }, { passive: true });
    },

    _update: function () {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      this.bar.style.width = progress + '%';
    }
  };

  /* ──────────────────────────────────────────────
   *  7. SCROLL-REVEAL ANIMATIONS
   * ────────────────────────────────────────────── */

  const ScrollReveal = {
    observer: null,

    init: function () {
      const targets = $$('.dashboard-card, section.constitution-section, .oath-card, .signatory-card');

      if (!targets.length || !window.IntersectionObserver) return;

      targets.forEach(function (el) {
        el.classList.add('reveal-hidden');
      });

      const options = {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.05
      };

      this.observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible');
            entry.target.classList.remove('reveal-hidden');
            ScrollReveal.observer.unobserve(entry.target);
          }
        });
      }, options);

      targets.forEach(function (el) {
        ScrollReveal.observer.observe(el);
      });
    }
  };

  /* ──────────────────────────────────────────────
   *  8. PRINT BUTTON
   * ────────────────────────────────────────────── */

  const PrintButton = {
    init: function () {
      const btn = $('#printBtn');
      if (!btn) return;

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        window.print();
      });
    }
  };

  /* ──────────────────────────────────────────────
   *  9. FONT SIZE CONTROLS
   * ────────────────────────────────────────────── */

  const FontSize = {
    STORAGE_KEY: 'cibssa-font-size',
    MIN: 14,
    MAX: 24,
    DEFAULT: 16,
    STEP: 2,
    _current: 16,

    init: function () {
      const increaseBtn = $('#fontIncrease');
      const decreaseBtn = $('#fontDecrease');
      const mainContent = $('#mainContent');

      if (!mainContent) return;

      const saved = localStorage.getItem(this.STORAGE_KEY);
      this._current = saved ? parseInt(saved, 10) : this.DEFAULT;
      this._apply();

      if (increaseBtn) {
        increaseBtn.addEventListener('click', () => {
          if (this._current < this.MAX) {
            this._current += this.STEP;
            this._apply();
            this._save();
          }
        });
      }
      if (decreaseBtn) {
        decreaseBtn.addEventListener('click', () => {
          if (this._current > this.MIN) {
            this._current -= this.STEP;
            this._apply();
            this._save();
          }
        });
      }
    },

    _apply: function () {
      const mainContent = $('#mainContent');
      if (mainContent) {
        mainContent.style.fontSize = this._current + 'px';
      }
    },

    _save: function () {
      localStorage.setItem(this.STORAGE_KEY, this._current.toString());
    }
  };

  /* ──────────────────────────────────────────────
   *  10. MOBILE RESPONSIVE HELPERS
   * ────────────────────────────────────────────── */

  const Mobile = {
    init: function () {
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          Sidebar._closeMobile();
        }
      });

      const sidebarEl = $('#sidebar');
      if (sidebarEl) {
        sidebarEl.addEventListener('touchmove', function (e) {
          e.stopPropagation();
        }, { passive: true });
      }

      const mql = window.matchMedia('(min-width: 1024px)');
      function handleResize(e) {
        if (e.matches) {
          Sidebar._closeMobile();
        }
      }
      if (mql.addEventListener) {
        mql.addEventListener('change', handleResize);
      } else if (mql.addListener) {
        mql.addListener(handleResize);
      }
    }
  };

  /* ──────────────────────────────────────────────
   *  11. HEADER SHADOW ON SCROLL
   * ────────────────────────────────────────────── */

  const HeaderShadow = {
    init: function () {
      const header = $('#mainHeader');
      if (!header) return;

      window.addEventListener('scroll', function () {
        if (window.pageYOffset > 10) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      }, { passive: true });
    }
  };

  /* ──────────────────────────────────────────────
   *  12. MOBILE HORIZONTAL TABS
   * ────────────────────────────────────────────── */

  const MobileTabs = {
    container: null,

    init: function () {
      this.container = $('#mobileTabsContainer');
      if (!this.container) return;

      this._buildTabs();
    },

    _buildTabs: function () {
      this.container.innerHTML = '';

      const tabs = [
        { id: 'home', label: '🏠 Home' },
        { id: 'preamble', label: 'Preamble' },
        { id: 'article-1', label: 'Art 1' },
        { id: 'article-2', label: 'Art 2' },
        { id: 'article-3', label: 'Art 3' },
        { id: 'article-4', label: 'Art 4' },
        { id: 'article-5', label: 'Art 5' },
        { id: 'article-6', label: 'Art 6' },
        { id: 'article-7', label: 'Art 7' },
        { id: 'article-8', label: 'Art 8' },
        { id: 'article-9', label: 'Art 9' },
        { id: 'article-10', label: 'Art 10' },
        { id: 'article-11', label: 'Art 11' },
        { id: 'article-12', label: 'Art 12' },
        { id: 'assent', label: 'Assent' },
        { id: 'appendices', label: 'Oaths' }
      ];

      tabs.forEach(tab => {
        const item = document.createElement('a');
        item.href = '#' + tab.id;
        item.className = 'mobile-tab-item';
        item.textContent = tab.label;
        item.setAttribute('data-tab-id', tab.id);

        item.addEventListener('click', function () {
          Sidebar._closeMobile();
        });

        this.container.appendChild(item);
      });
    },

    updateActive: function (hash) {
      if (!this.container) return;

      const activeId = hash || 'home';
      const items = $$('.mobile-tab-item', this.container);

      items.forEach(item => {
        const tabId = item.getAttribute('data-tab-id');
        if (tabId === activeId) {
          item.classList.add('active');
          item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } else {
          item.classList.remove('active');
        }
      });
    }
  };

  /* ──────────────────────────────────────────────
   *  BOOT – Initialise everything on DOMContentLoaded
   * ────────────────────────────────────────────── */

  function boot() {
    DarkMode.init();
    Sidebar.init();
    AppRouter.init();
    MobileTabs.init();
    Search.init();
    BackToTop.init();
    ProgressBar.init();
    ScrollReveal.init();
    PrintButton.init();
    FontSize.init();
    Mobile.init();
    HeaderShadow.init();

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('%c[CIBSSA] Constitution app initialised ✓', 'color: #7c3aed; font-weight: bold;');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
