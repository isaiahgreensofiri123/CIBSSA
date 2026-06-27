/**
 * ============================================================
 *  CIBSSA Constitution – Interactive Website Script
 *  Cinematography & Broadcast Studies Student's Association
 * ============================================================
 *  Vanilla JavaScript – no frameworks, no jQuery.
 *  Features:
 *    1.  Dark / Light mode toggle (persisted)
 *    2.  Sidebar table-of-contents (auto-generated)
 *    3.  Full-text search with highlighting
 *    4.  Collapsible article accordions
 *    5.  Back-to-top button
 *    6.  Reading progress bar
 *    7.  Scroll-reveal animations
 *    8.  Print button
 *    9.  Font-size controls (persisted)
 *   10.  Mobile hamburger menu
 * ============================================================
 */

;(function () {
  'use strict';

  /* ──────────────────────────────────────────────
   *  0. UTILITY HELPERS
   * ────────────────────────────────────────────── */

  /**
   * Debounce – delays invoking `fn` until after `wait` ms of silence.
   * @param {Function} fn
   * @param {number}   wait  milliseconds
   * @returns {Function}
   */
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

  /**
   * Shorthand querySelector / querySelectorAll
   */
  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }
  function $$(selector, scope) {
    return Array.from((scope || document).querySelectorAll(selector));
  }

  /**
   * Escape special regex characters in a string.
   */
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /* ──────────────────────────────────────────────
   *  1. DARK / LIGHT MODE TOGGLE
   * ────────────────────────────────────────────── */

  const DarkMode = {
    STORAGE_KEY: 'cibssa-dark-mode',
    body: document.body,

    /** Initialise – read stored preference or respect OS setting */
    init: function () {
      const toggle = $('#theme-toggle');
      if (!toggle) return;

      // Determine initial state
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored === 'true') {
        this.enable();
      } else if (stored === 'false') {
        this.disable();
      } else {
        // No preference saved – fall back to OS preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          this.enable();
        }
      }

      // Toggle on click
      toggle.addEventListener('click', function () {
        DarkMode.toggle();
      });
    },

    enable: function () {
      this.body.classList.add('dark-mode');
      localStorage.setItem(this.STORAGE_KEY, 'true');
      this._updateToggleIcon(true);
    },

    disable: function () {
      this.body.classList.remove('dark-mode');
      localStorage.setItem(this.STORAGE_KEY, 'false');
      this._updateToggleIcon(false);
    },

    toggle: function () {
      if (this.body.classList.contains('dark-mode')) {
        this.disable();
      } else {
        this.enable();
      }
    },

    /** Update the icon inside the toggle button */
    _updateToggleIcon: function (isDark) {
      const icon = $('#theme-toggle .toggle-icon, #theme-toggle i');
      if (!icon) return;
      if (isDark) {
        icon.textContent = '☀️';
        icon.setAttribute('aria-label', 'Switch to light mode');
      } else {
        icon.textContent = '🌙';
        icon.setAttribute('aria-label', 'Switch to dark mode');
      }
    }
  };

  /* ──────────────────────────────────────────────
   *  2. SIDEBAR NAVIGATION (Table of Contents)
   * ────────────────────────────────────────────── */

  const Sidebar = {
    container: null,       // #sidebar or #toc-container
    tocList: null,         // <ul> that will hold links
    observer: null,        // IntersectionObserver for active-link tracking
    headingMap: [],        // { id, el, tocLink }

    init: function () {
      this.container = $('#sidebar') || $('#toc-container');
      this.tocList = $('#toc-list');
      if (!this.tocList) return;

      this._buildTOC();
      this._observeSections();
      this._bindMobileToggle();
    },

    /* ---- Build the TOC from the DOM ---- */
    _buildTOC: function () {
      // Grab every <article> (or .article) heading
      const articles = $$('article, .article');

      articles.forEach(function (article) {
        // Find the article's primary heading
        const heading = $('h2, h3, .article-header, .article-title', article);
        if (!heading) return;

        // Ensure heading has an id
        if (!heading.id) {
          heading.id = 'toc-' + Sidebar._slugify(heading.textContent);
        }

        // Create top-level <li>
        const li = document.createElement('li');
        li.classList.add('toc-item', 'toc-article');

        const a = document.createElement('a');
        a.href = '#' + heading.id;
        a.textContent = heading.textContent.trim();
        a.classList.add('toc-link');
        li.appendChild(a);

        Sidebar.headingMap.push({ id: heading.id, el: heading, tocLink: a });

        // Sub-sections inside this article
        const sections = $$('section, .section', article);
        if (sections.length) {
          const subUl = document.createElement('ul');
          subUl.classList.add('toc-sub-list');

          sections.forEach(function (sec) {
            const secHeading = $('h3, h4, .section-title, .section-header', sec);
            if (!secHeading) return;

            if (!secHeading.id) {
              secHeading.id = 'toc-' + Sidebar._slugify(secHeading.textContent);
            }

            const subLi = document.createElement('li');
            subLi.classList.add('toc-item', 'toc-section');

            const subA = document.createElement('a');
            subA.href = '#' + secHeading.id;
            subA.textContent = secHeading.textContent.trim();
            subA.classList.add('toc-link', 'toc-sub-link');
            subLi.appendChild(subA);
            subUl.appendChild(subLi);

            Sidebar.headingMap.push({ id: secHeading.id, el: secHeading, tocLink: subA });
          });

          li.appendChild(subUl);

          // Collapse toggle
          a.classList.add('has-children');
          const chevron = document.createElement('span');
          chevron.classList.add('toc-chevron');
          chevron.innerHTML = '&#9662;'; // ▾
          a.prepend(chevron);

          // Click chevron to collapse / expand sub-list
          chevron.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            li.classList.toggle('collapsed');
          });
        }

        Sidebar.tocList.appendChild(li);

        // Smooth scroll when clicking any TOC link
        a.addEventListener('click', function (e) {
          e.preventDefault();
          Sidebar._scrollTo(heading.id);
          Sidebar._closeMobile();
        });
      });

      // Bind sub-link clicks
      $$('.toc-sub-link').forEach(function (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          var targetId = this.getAttribute('href').slice(1);
          Sidebar._scrollTo(targetId);
          Sidebar._closeMobile();
        });
      });
    },

    /* ---- IntersectionObserver for active TOC link ---- */
    _observeSections: function () {
      if (!this.headingMap.length) return;

      var options = {
        root: null,
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0
      };

      this.observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            // Remove active from all
            Sidebar.headingMap.forEach(function (h) {
              h.tocLink.classList.remove('active');
            });
            // Activate the visible one
            var match = Sidebar.headingMap.find(function (h) {
              return h.id === entry.target.id;
            });
            if (match) {
              match.tocLink.classList.add('active');
              // Ensure parent article item is expanded
              var parentLi = match.tocLink.closest('.toc-article');
              if (parentLi) parentLi.classList.remove('collapsed');
            }
          }
        });
      }, options);

      this.headingMap.forEach(function (h) {
        Sidebar.observer.observe(h.el);
      });
    },

    /* ---- Mobile hamburger toggle ---- */
    _bindMobileToggle: function () {
      var hamburger = $('#hamburger, #mobile-menu-toggle, .hamburger');
      var overlay = $('#sidebar-overlay, .sidebar-overlay');

      if (hamburger) {
        hamburger.addEventListener('click', function () {
          Sidebar._toggleMobile();
        });
      }
      if (overlay) {
        overlay.addEventListener('click', function () {
          Sidebar._closeMobile();
        });
      }
    },

    _toggleMobile: function () {
      if (this.container) this.container.classList.toggle('open');
      var overlay = $('#sidebar-overlay, .sidebar-overlay');
      if (overlay) overlay.classList.toggle('visible');
      document.body.classList.toggle('sidebar-open');
    },

    _closeMobile: function () {
      if (this.container) this.container.classList.remove('open');
      var overlay = $('#sidebar-overlay, .sidebar-overlay');
      if (overlay) overlay.classList.remove('visible');
      document.body.classList.remove('sidebar-open');
    },

    /* ---- Smooth scroll helper ---- */
    _scrollTo: function (id) {
      var target = document.getElementById(id);
      if (!target) return;
      var headerOffset = 80; // account for fixed header
      var top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
      window.scrollTo({ top: top, behavior: 'smooth' });

      // Also expand the article if it's collapsed
      var article = target.closest('article, .article');
      if (article) {
        var content = $('.article-content, .article-body', article);
        if (content && content.classList.contains('collapsed')) {
          content.classList.remove('collapsed');
          article.classList.add('expanded');
        }
      }
    },

    /* ---- Slug helper ---- */
    _slugify: function (text) {
      return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 60);
    }
  };

  /* ──────────────────────────────────────────────
   *  3. SEARCH FUNCTIONALITY
   * ────────────────────────────────────────────── */

  const Search = {
    input: null,
    clearBtn: null,
    resultsContainer: null,
    resultCount: null,
    _allSections: [],     // cached { heading, text, el }

    init: function () {
      this.input = $('#search-input');
      this.clearBtn = $('#search-clear');
      this.resultsContainer = $('#search-results');
      this.resultCount = $('#search-count, #result-count');
      if (!this.input) return;

      this._cacheContent();

      // Debounced search
      this.input.addEventListener('input', debounce(function () {
        Search._performSearch(Search.input.value.trim());
      }, 300));

      // Clear button
      if (this.clearBtn) {
        this.clearBtn.addEventListener('click', function () {
          Search.input.value = '';
          Search._clearResults();
          Search.input.focus();
        });
      }

      // Close results on outside click
      document.addEventListener('click', function (e) {
        if (Search.resultsContainer && !Search.resultsContainer.contains(e.target) && e.target !== Search.input) {
          Search.resultsContainer.classList.remove('visible');
        }
      });

      // Show results again on focus if there's a query
      this.input.addEventListener('focus', function () {
        if (Search.input.value.trim().length >= 2 && Search.resultsContainer) {
          Search.resultsContainer.classList.add('visible');
        }
      });
    },

    /** Cache all searchable text blocks on page load */
    _cacheContent: function () {
      var blocks = $$('article, .article, section, .section');
      blocks.forEach(function (block) {
        var heading = $('h2, h3, h4, .article-title, .article-header, .section-title, .section-header', block);
        var headingText = heading ? heading.textContent.trim() : '';
        var bodyText = block.textContent.trim();
        var id = heading ? heading.id : block.id;

        if (!id) {
          id = 'search-' + Math.random().toString(36).substring(2, 9);
          if (heading) heading.id = id;
          else block.id = id;
        }

        Search._allSections.push({
          heading: headingText,
          text: bodyText,
          id: id,
          el: block
        });
      });
    },

    /** Run a search and display results */
    _performSearch: function (query) {
      this._clearHighlights();

      if (query.length < 2) {
        this._clearResults();
        return;
      }

      var regex = new RegExp('(' + escapeRegex(query) + ')', 'gi');
      var matches = [];

      this._allSections.forEach(function (section) {
        if (regex.test(section.text)) {
          // Extract a snippet around the first match
          var idx = section.text.toLowerCase().indexOf(query.toLowerCase());
          var start = Math.max(0, idx - 40);
          var end = Math.min(section.text.length, idx + query.length + 80);
          var snippet = (start > 0 ? '…' : '') +
                        section.text.substring(start, end).replace(regex, '<mark>$1</mark>') +
                        (end < section.text.length ? '…' : '');

          matches.push({
            heading: section.heading,
            snippet: snippet,
            id: section.id,
            el: section.el
          });
        }
      });

      this._renderResults(matches, query);
    },

    /** Render the results dropdown */
    _renderResults: function (matches, query) {
      if (!this.resultsContainer) return;

      this.resultsContainer.innerHTML = '';

      if (matches.length === 0) {
        this.resultsContainer.innerHTML = '<div class="search-no-results">No results found for "<strong>' + escapeRegex(query) + '</strong>"</div>';
        this.resultsContainer.classList.add('visible');
        if (this.resultCount) this.resultCount.textContent = '0 results';
        return;
      }

      if (this.resultCount) {
        this.resultCount.textContent = matches.length + ' result' + (matches.length !== 1 ? 's' : '');
      }

      matches.forEach(function (m) {
        var item = document.createElement('div');
        item.classList.add('search-result-item');
        item.innerHTML =
          '<div class="search-result-heading">' + m.heading + '</div>' +
          '<div class="search-result-snippet">' + m.snippet + '</div>';

        item.addEventListener('click', function () {
          Sidebar._scrollTo(m.id);
          Search.resultsContainer.classList.remove('visible');

          // Also expand article
          var article = m.el.closest('article, .article');
          if (article) Accordion.expand(article);
        });

        Search.resultsContainer.appendChild(item);
      });

      this.resultsContainer.classList.add('visible');
    },

    _clearResults: function () {
      if (this.resultsContainer) {
        this.resultsContainer.innerHTML = '';
        this.resultsContainer.classList.remove('visible');
      }
      if (this.resultCount) this.resultCount.textContent = '';
      this._clearHighlights();
    },

    /** Remove all <mark> highlights from document body */
    _clearHighlights: function () {
      $$('mark.search-highlight').forEach(function (mark) {
        var parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      });
    }
  };

  /* ──────────────────────────────────────────────
   *  4. COLLAPSIBLE ARTICLE ACCORDIONS
   * ────────────────────────────────────────────── */

  const Accordion = {
    init: function () {
      var articles = $$('article, .article');
      articles.forEach(function (article) {
        var header = $('h2, .article-header, .article-title', article);
        var content = $( '.article-content, .article-body', article);
        if (!header || !content) return;

        // Add chevron indicator
        if (!$('.accordion-chevron', header)) {
          var chevron = document.createElement('span');
          chevron.classList.add('accordion-chevron');
          chevron.innerHTML = '&#9660;'; // ▼
          header.appendChild(chevron);
        }

        // Start expanded by default (first article) or collapsed
        // We keep them all expanded initially for accessibility
        article.classList.add('accordion', 'expanded');

        header.style.cursor = 'pointer';
        header.setAttribute('role', 'button');
        header.setAttribute('aria-expanded', 'true');
        header.setAttribute('tabindex', '0');

        header.addEventListener('click', function () {
          Accordion.toggle(article);
        });

        // Keyboard support
        header.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            Accordion.toggle(article);
          }
        });
      });

      // Expand All / Collapse All buttons
      var expandAllBtn = $('#expand-all');
      var collapseAllBtn = $('#collapse-all');

      if (expandAllBtn) {
        expandAllBtn.addEventListener('click', function () {
          Accordion.expandAll();
        });
      }
      if (collapseAllBtn) {
        collapseAllBtn.addEventListener('click', function () {
          Accordion.collapseAll();
        });
      }
    },

    toggle: function (article) {
      if (article.classList.contains('expanded')) {
        this.collapse(article);
      } else {
        this.expand(article);
      }
    },

    expand: function (article) {
      var content = $( '.article-content, .article-body', article);
      var header = $('h2, .article-header, .article-title', article);
      if (!content) return;

      article.classList.add('expanded');
      article.classList.remove('collapsed-article');

      // Animate height
      content.style.maxHeight = content.scrollHeight + 'px';
      content.style.opacity = '1';

      if (header) header.setAttribute('aria-expanded', 'true');

      // After transition, remove max-height so nested content isn't clipped
      setTimeout(function () {
        content.style.maxHeight = 'none';
      }, 500);
    },

    collapse: function (article) {
      var content = $( '.article-content, .article-body', article);
      var header = $('h2, .article-header, .article-title', article);
      if (!content) return;

      // Set explicit height first so CSS transition works
      content.style.maxHeight = content.scrollHeight + 'px';
      // Force reflow
      content.offsetHeight; // eslint-disable-line no-unused-expressions

      content.style.maxHeight = '0';
      content.style.opacity = '0';

      article.classList.remove('expanded');
      article.classList.add('collapsed-article');

      if (header) header.setAttribute('aria-expanded', 'false');
    },

    expandAll: function () {
      $$('article, .article').forEach(function (article) {
        Accordion.expand(article);
      });
    },

    collapseAll: function () {
      $$('article, .article').forEach(function (article) {
        Accordion.collapse(article);
      });
    }
  };

  /* ──────────────────────────────────────────────
   *  5. BACK-TO-TOP BUTTON
   * ────────────────────────────────────────────── */

  const BackToTop = {
    btn: null,
    SCROLL_THRESHOLD: 300,

    init: function () {
      this.btn = $('#back-to-top');
      if (!this.btn) return;

      // Show / hide based on scroll position
      window.addEventListener('scroll', function () {
        if (window.pageYOffset > BackToTop.SCROLL_THRESHOLD) {
          BackToTop.btn.classList.add('visible');
        } else {
          BackToTop.btn.classList.remove('visible');
        }
      }, { passive: true });

      // Scroll to top on click
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
      this.bar = $('#progress-bar, .progress-bar');

      // Create the bar if it doesn't already exist in the DOM
      if (!this.bar) {
        this.bar = document.createElement('div');
        this.bar.id = 'progress-bar';
        this.bar.setAttribute('role', 'progressbar');
        this.bar.setAttribute('aria-valuemin', '0');
        this.bar.setAttribute('aria-valuemax', '100');
        document.body.prepend(this.bar);

        // Inline styles as fallback (CSS file should override)
        Object.assign(this.bar.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          height: '3px',
          width: '0%',
          background: 'linear-gradient(90deg, #7c3aed, #db2777, #06b6d4)',
          zIndex: '10000',
          transition: 'width 0.15s ease-out',
          borderRadius: '0 2px 2px 0'
        });
      }

      window.addEventListener('scroll', function () {
        ProgressBar._update();
      }, { passive: true });
    },

    _update: function () {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      this.bar.style.width = progress + '%';
      this.bar.setAttribute('aria-valuenow', Math.round(progress));
    }
  };

  /* ──────────────────────────────────────────────
   *  7. SCROLL-REVEAL ANIMATIONS
   * ────────────────────────────────────────────── */

  const ScrollReveal = {
    observer: null,

    init: function () {
      var targets = $$('.reveal, article, .article, section, .section, .preamble, .amendment');

      if (!targets.length) return;

      // Add the initial hidden class
      targets.forEach(function (el) {
        el.classList.add('reveal-hidden');
      });

      var options = {
        root: null,
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.1
      };

      this.observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible');
            entry.target.classList.remove('reveal-hidden');
            // Unobserve after reveal so animation only plays once
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
      var btn = $('#print-btn, #print-button, .print-btn');
      if (!btn) return;

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        // Expand all articles before printing
        Accordion.expandAll();
        // Small delay to let DOM update
        setTimeout(function () {
          window.print();
        }, 300);
      });
    }
  };

  /* ──────────────────────────────────────────────
   *  9. FONT SIZE CONTROLS
   * ────────────────────────────────────────────── */

  const FontSize = {
    STORAGE_KEY: 'cibssa-font-size',
    MIN: 12,
    MAX: 24,
    DEFAULT: 16,
    STEP: 2,
    _current: 16,

    init: function () {
      var increaseBtn = $('#font-increase, .font-increase');
      var decreaseBtn = $('#font-decrease, .font-decrease');
      var resetBtn = $('#font-reset, .font-reset');

      // Load saved preference
      var saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this._current = parseInt(saved, 10);
      } else {
        this._current = this.DEFAULT;
      }
      this._apply();

      if (increaseBtn) {
        increaseBtn.addEventListener('click', function () {
          FontSize.increase();
        });
      }
      if (decreaseBtn) {
        decreaseBtn.addEventListener('click', function () {
          FontSize.decrease();
        });
      }
      if (resetBtn) {
        resetBtn.addEventListener('click', function () {
          FontSize.reset();
        });
      }
    },

    increase: function () {
      if (this._current < this.MAX) {
        this._current += this.STEP;
        this._apply();
        this._save();
      }
    },

    decrease: function () {
      if (this._current > this.MIN) {
        this._current -= this.STEP;
        this._apply();
        this._save();
      }
    },

    reset: function () {
      this._current = this.DEFAULT;
      this._apply();
      this._save();
    },

    _apply: function () {
      var mainContent = $('#main-content, .main-content, main');
      if (mainContent) {
        mainContent.style.fontSize = this._current + 'px';
      } else {
        document.documentElement.style.fontSize = this._current + 'px';
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
      // Close sidebar on Escape key
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          Sidebar._closeMobile();
        }
      });

      // Prevent body scroll when sidebar is open
      var sidebarEl = $('#sidebar');
      if (sidebarEl) {
        sidebarEl.addEventListener('touchmove', function (e) {
          e.stopPropagation();
        }, { passive: true });
      }

      // Handle viewport resize – close sidebar if switching to desktop
      var mql = window.matchMedia('(min-width: 1024px)');
      function handleResize(e) {
        if (e.matches) {
          Sidebar._closeMobile();
        }
      }
      if (mql.addEventListener) {
        mql.addEventListener('change', handleResize);
      } else if (mql.addListener) {
        mql.addListener(handleResize); // Safari < 14
      }
    }
  };

  /* ──────────────────────────────────────────────
   *  ADDITIONAL: Smooth anchor handling for all
   *  in-page links (not just TOC links)
   * ────────────────────────────────────────────── */

  const SmoothAnchors = {
    init: function () {
      document.addEventListener('click', function (e) {
        var link = e.target.closest('a[href^="#"]');
        if (!link) return;
        var targetId = link.getAttribute('href').slice(1);
        if (!targetId) return;
        var target = document.getElementById(targetId);
        if (!target) return;

        e.preventDefault();
        var headerOffset = 80;
        var top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    }
  };

  /* ──────────────────────────────────────────────
   *  ADDITIONAL: Active header shadow on scroll
   * ────────────────────────────────────────────── */

  const HeaderShadow = {
    init: function () {
      var header = $('header, .site-header, #site-header');
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
   *  BOOT – Initialise everything on DOMContentLoaded
   * ────────────────────────────────────────────── */

  function boot() {
    DarkMode.init();
    Sidebar.init();
    Search.init();
    Accordion.init();
    BackToTop.init();
    ProgressBar.init();
    ScrollReveal.init();
    PrintButton.init();
    FontSize.init();
    Mobile.init();
    SmoothAnchors.init();
    HeaderShadow.init();

    // Log successful initialisation (dev mode only)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('%c[CIBSSA] Constitution site initialised ✓', 'color: #7c3aed; font-weight: bold;');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
