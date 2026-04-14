// ── Intro overlay sequence (once per session) ──
(function () {
  const introOverlay = document.getElementById('intro-overlay');
  if (!introOverlay) return;

  // Check if intro has already played this session
  const introShown = sessionStorage.getItem('intro-shown');

  // Get all main content
  const mainContent = document.querySelectorAll('nav, #sidebar, #hero, #work-grid, #practice, #work, #experience, #contact, footer');

  if (introShown) {
    // Skip intro, show content immediately
    introOverlay.style.display = 'none';
    mainContent.forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  } else {
    // Play intro for first time this session
    // Hide all main content initially
    mainContent.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(40px)';
    });

    // After intro animation completes (2050ms), fade in main content
    setTimeout(() => {
      introOverlay.style.display = 'none';
      introOverlay.style.pointerEvents = 'none';
      mainContent.forEach(el => {
        el.style.transition = 'opacity 800ms ease, transform 800ms cubic-bezier(0.16, 1, 0.3, 1)';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
      // Mark intro as shown for this session
      sessionStorage.setItem('intro-shown', 'true');
    }, 2050);
  }
}());

// ── Hero: parallax + cinematic fade ──
const heroBg   = document.getElementById('hero-parallax');
const heroFade = document.getElementById('hero-fade');
const heroEl   = document.getElementById('hero');

function updateHero() {
  const sy = window.scrollY;
  const hh = heroEl.offsetHeight;
  heroBg.style.transform = `translateY(${sy * 0.28}px)`;
  const p = Math.min(Math.max((sy - hh * 0.35) / (hh * 0.50), 0), 1);
  heroFade.style.opacity = (p * 0.88).toFixed(3);
}
window.addEventListener('scroll', updateHero, { passive: true });

// ── Hero: cinematic title reveal — word-wrap line split ──
(function () {
  const h1 = document.querySelector('#hero h1');
  if (!h1) return;

  const words = h1.textContent.trim().split(/\s+/);
  h1.innerHTML = words.map(w =>
    `<span class="hero-word"><span class="hero-line-inner">${w}&nbsp;</span></span>`
  ).join('');

  const inners = h1.querySelectorAll('.hero-line-inner');
  inners.forEach((el, i) => {
    setTimeout(() => el.classList.add('visible'), 60 + i * 55);
  });
}());

// Trigger remaining hero reveals after title animates in
document.querySelectorAll('#hero .reveal').forEach((el, i) => {
  setTimeout(() => el.classList.add('visible'), 280 + i * 120);
});

// ── Mobile menu ──
(function () {
  const btn     = document.getElementById('menu-btn');
  const overlay = document.getElementById('menu-overlay');
  const closeBtn = document.getElementById('menu-close');
  if (!btn || !overlay) return;

  function openMenu() {
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.add('menu-btn--hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.classList.remove('menu-btn--hidden');
    document.body.style.overflow = '';
  }

  btn.addEventListener('click', openMenu);
  closeBtn.addEventListener('click', closeMenu);

  overlay.querySelectorAll('.overlay-link').forEach(link => {
    link.addEventListener('click', () => setTimeout(closeMenu, 80));
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
}());

// ── Sidebar: highlight active section on scroll ──
(function () {
  const links = document.querySelectorAll('.sidebar-link');
  const sections = Array.from(links).map(l => document.querySelector(l.getAttribute('href'))).filter(Boolean);
  function updateSidebar() {
    let current = sections[0];
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - window.innerHeight * 0.4) current = s; });
    links.forEach(l => {
      l.classList.toggle('sidebar-link--active', l.getAttribute('href') === '#' + current.id);
    });
  }
  window.addEventListener('scroll', updateSidebar, { passive: true });
  updateSidebar();
}());


// ── Monogram: tap-to-open on touch devices ──
(function () {
  const mono = document.getElementById('monogram');
  if (!mono) return;

  // Only intercept on touch-capable devices
  mono.addEventListener('touchstart', function (e) {
    // If not yet open, open it and prevent navigation
    if (!mono.classList.contains('monogram--open')) {
      e.preventDefault();
      mono.classList.add('monogram--open');
    }
    // Second tap navigates normally (no preventDefault)
  }, { passive: false });

  // Tapping elsewhere closes it
  document.addEventListener('touchstart', function (e) {
    if (!mono.contains(e.target)) {
      mono.classList.remove('monogram--open');
    }
  }, { passive: true });
}());
