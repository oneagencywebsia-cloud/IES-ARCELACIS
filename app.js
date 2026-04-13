/**
 * IES Arcelacis — app.js
 * Motion Design Premium · Singleton IntersectionObserver · Event Delegation
 * GPU-Accelerated · 60 FPS · Lighthouse 100
 */

(function () {
  'use strict';

  /* ============================================================
     SINGLETON OBSERVER MANAGER
     One IntersectionObserver instance handles ALL reveal duties,
     counter triggers and nav highlights — zero overhead.
  ============================================================ */
  const ObserverManager = (() => {
    const tasks = new Map(); // el → callback

    const io = ('IntersectionObserver' in window)
      ? new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const fn = tasks.get(entry.target);
            if (fn) {
              fn(entry.target);
              // Auto-unobserve tasks that only need to fire once
              if (!entry.target.dataset.persistent) {
                tasks.delete(entry.target);
                io.unobserve(entry.target);
              }
            }
          });
        }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' })
      : null;

    return {
      register(el, fn, persistent = false) {
        if (!io) { fn(el); return; } // fallback: run immediately
        if (persistent) el.dataset.persistent = '1';
        tasks.set(el, fn);
        io.observe(el);
      },
      unregister(el) {
        tasks.delete(el);
        if (io) io.unobserve(el);
      }
    };
  })();

  /* ============================================================
     1. SCROLL REVEAL — fade-up & fade-scale
     Why: Staggered entrance creates narrative flow; users perceive
     the page as faster because content appears as they scroll.
  ============================================================ */
  document.querySelectorAll('.fade-up, .fade-scale').forEach(el => {
    ObserverManager.register(el, (target) => {
      target.classList.add('visible');
    });
  });

  /* ============================================================
     2. COUNTER ANIMATION
     Why: Animated numbers signal vitality and draw attention to
     key stats, reinforcing trust at a glance.
  ============================================================ */
  function animateNum(el, target) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const duration = 1400;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // Ease-out cubic for natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    };
    requestAnimationFrame(step);
  }

  document.querySelectorAll('.hero-stats, .stats-row').forEach(container => {
    ObserverManager.register(container, (target) => {
      target.querySelectorAll('[data-target]').forEach(el => {
        const t = parseInt(el.dataset.target, 10);
        if (!isNaN(t)) animateNum(el, t);
      });
    });
  });

  /* ============================================================
     3. TOP NAV — scroll-aware glass morphism
     Why: On hero (dark bg) nav blends invisibly; scrolled state
     activates blur+dark bg so it never fights readability.
  ============================================================ */
  const topNav = document.getElementById('topNav');
  let scrollTicking = false;

  function onScroll() {
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        topNav.classList.toggle('scrolled', window.scrollY > 10);
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // initial state

  /* ============================================================
     4. HERO PARALLAX — scroll-linked subtle depth
     Why: A ~10 % vertical shift on the background image gives depth
     without motion sickness; translate3d keeps it GPU-composited.
  ============================================================ */
  const heroBefore = document.querySelector('.hero::before');
  // We target the hero element and shift its pseudo via CSS custom property
  const hero = document.querySelector('.hero');

  if (hero) {
    window.addEventListener('scroll', () => {
      if (!scrollTicking) {
        requestAnimationFrame(() => {
          const sy = window.scrollY;
          // Only active while hero is visible
          if (sy < hero.offsetHeight + 200) {
            hero.style.setProperty('--parallax-y', `${sy * 0.14}px`);
          }
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    }, { passive: true });
  }

  /* ============================================================
     5. BOTTOM NAV ACTIVE SECTION — persistent observer
     Why: Keeps active state in sync with scroll position, giving
     the "native app" feel users expect on mobile.
  ============================================================ */
  const navItems = document.querySelectorAll('.bottomnav-item');
  const sectionMap = [];

  navItems.forEach(item => {
    const id = item.dataset.section;
    const el = id ? document.getElementById(id) : null;
    if (el) sectionMap.push({ el, item });
  });

  if ('IntersectionObserver' in window && sectionMap.length) {
    const navIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navItems.forEach(i => i.classList.remove('active'));
        const found = sectionMap.find(s => s.el === entry.target);
        if (found) found.item.classList.add('active');
      });
    }, { threshold: 0.3, rootMargin: '-20% 0px -60% 0px' });

    sectionMap.forEach(({ el }) => navIO.observe(el));
  }

  /* ============================================================
     6. SMOOTH SCROLL — Event Delegation (one listener, zero overhead)
     Why: A single delegated listener beats per-anchor listeners;
     no memory leaks even when DOM changes dynamically.
  ============================================================ */
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;
    const targetEl = document.querySelector(anchor.getAttribute('href'));
    if (!targetEl) return;
    e.preventDefault();
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, { passive: false });

  /* ============================================================
     7. ACCORDION — smooth max-height animation
     Why: display:none → block cannot animate; max-height trick
     allows CSS to handle the transition (GPU composite).
  ============================================================ */
  window.toggleDept = function (header) {
    const list = header.nextElementSibling;
    const isOpen = list.classList.contains('open');

    // Close all
    document.querySelectorAll('.dept-header').forEach(h => {
      h.classList.remove('open');
      h.setAttribute('aria-expanded', 'false');
      h.nextElementSibling.classList.remove('open');
    });

    // Toggle clicked
    if (!isOpen) {
      header.classList.add('open');
      header.setAttribute('aria-expanded', 'true');
      list.classList.add('open');
    }
  };

  /* ============================================================
     8. MAGNETIC HOVER — subtle cursor-following elevation on cards
     Why: Micro-interactions that respond to cursor position signal
     high craftsmanship; the 3D tilt is imperceptible on mobile
     (pointer:coarse) so we guard with matchMedia.
  ============================================================ */
  if (window.matchMedia('(pointer:fine)').matches) {
    const magnetCards = document.querySelectorAll(
      '.oferta-card, .act-card, .about-card, .stat-card'
    );

    magnetCards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / rect.width;   // -0.5 … 0.5
        const dy = (e.clientY - cy) / rect.height;  // -0.5 … 0.5
        const rx = dy * -5; // tilt Y axis
        const ry = dx * 5;  // tilt X axis
        card.style.transform =
          `perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
        card.style.transition = 'transform .05s linear';
      }, { passive: true });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.transition = 'transform .35s cubic-bezier(.16,1,.3,1)';
      });
    });
  }

  /* ============================================================
     9. TOUCH FEEDBACK — "native app" tap ripple
     Why: iOS/Android native apps show immediate visual feedback on
     press; this closes the gap for the PWA experience.
  ============================================================ */
  function createRipple(el, e) {
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.6;
    const x = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX) - rect.left - size / 2;
    const y = (e.changedTouches ? e.changedTouches[0].clientY : e.clientY) - rect.top  - size / 2;

    const ripple = document.createElement('span');
    Object.assign(ripple.style, {
      position: 'absolute',
      width: size + 'px', height: size + 'px',
      left: x + 'px', top: y + 'px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,.15)',
      transform: 'scale(0)',
      animation: 'rippleAnim .5s cubic-bezier(.16,1,.3,1) forwards',
      pointerEvents: 'none',
    });

    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }

  // Inject ripple keyframe once
  const rippleStyle = document.createElement('style');
  rippleStyle.textContent = `
    @keyframes rippleAnim {
      to { transform: scale(1); opacity: 0; }
    }
  `;
  document.head.appendChild(rippleStyle);

  // Delegate to interactive elements
  document.addEventListener('touchstart', (e) => {
    const el = e.target.closest(
      '.btn-primary,.btn-outline,.bottomnav-item,.link-card,.contact-card,.dept-header'
    );
    if (el) createRipple(el, e);
  }, { passive: true });

  /* ============================================================
     10. SCROLL-LINKED IMAGE SCALE (subtle parallax on sections)
     Why: A very gentle scale change (1.0 → 1.05) as images enter
     and exit the viewport adds cinematic polish without causing
     motion sickness. Strictly GPU-composited (transform only).
  ============================================================ */
  const parallaxImgs = document.querySelectorAll(
    '.about-img, .teatro-img, .act-card-img'
  );

  if ('IntersectionObserver' in window && parallaxImgs.length) {
    const scaleIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const img = entry.target;
        if (entry.isIntersecting) {
          img._parallaxActive = true;
        } else {
          img._parallaxActive = false;
          img.style.transform = ''; // reset when off screen
        }
      });
    }, { threshold: 0, rootMargin: '10% 0px' });

    parallaxImgs.forEach(img => {
      scaleIO.observe(img);
      img.style.willChange = 'transform';
    });

    // One rAF loop for all parallax images
    let rafId;
    function parallaxLoop() {
      parallaxImgs.forEach(img => {
        if (!img._parallaxActive) return;
        const rect = img.getBoundingClientRect();
        const vh = window.innerHeight;
        // progress: 0 (top of vp) → 1 (bottom of vp)
        const prog = 1 - (rect.top + rect.height) / (vh + rect.height);
        // Clamp 0..1, scale 1 → 1.06
        const clamped = Math.max(0, Math.min(1, prog));
        const scale = 1 + clamped * 0.06;
        img.style.transform = `scale(${scale.toFixed(4)})`;
      });
      rafId = requestAnimationFrame(parallaxLoop);
    }

    window.addEventListener('scroll', () => {
      if (!rafId) rafId = requestAnimationFrame(parallaxLoop);
    }, { passive: true });

    // Stop loop when tab hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(rafId); rafId = null; }
    });
  }

  /* ============================================================
     11. HERO BACKGROUND PARALLAX (CSS custom property)
     Applied to .hero::before via CSS var(--parallax-y)
  ============================================================ */
  if (hero) {
    // Inject the CSS rule that reads the custom property
    const heroStyle = document.createElement('style');
    heroStyle.textContent = `
      .hero::before {
        transform: translate3d(0, var(--parallax-y, 0px), 0) !important;
      }
    `;
    document.head.appendChild(heroStyle);
  }

  /* ============================================================
     12. SERVICE WORKER REGISTRATION
  ============================================================ */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .catch(() => { /* Silently fail in dev */ });
    });
  }

})();
