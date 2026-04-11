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

// ── Hero orb physics — deep space float ──
(function () {
  const hero   = document.getElementById('hero');
  const orbEls = [
    document.querySelector('.hero-orb-a'),
    document.querySelector('.hero-orb-b'),
    document.querySelector('.hero-orb-c'),
  ];
  if (!hero || orbEls.some(o => !o)) return;

  function heroSize() { return { w: hero.offsetWidth, h: hero.offsetHeight }; }

  function initOrb(el, i) {
    const er  = el.getBoundingClientRect();
    const hr  = hero.getBoundingClientRect();
    const cx  = er.left - hr.left + er.width  / 2;
    const cy  = er.top  - hr.top  + er.height / 2;
    const r   = Math.max(er.width, er.height) / 2;
    const spd = 0.3 + Math.random() * 0.4;
    const ang = Math.random() * Math.PI * 2;
    return { x: cx, y: cy, r, el,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      ox: cx, oy: cy,
      scale: 1.0,
      targetScale: 1.0,
    };
  }

  const orbs = orbEls.map(initOrb);

  // Reinitialize orb positions on window resize
  window.addEventListener('resize', () => {
    orbEls.forEach((el, i) => {
      const newOrb = initOrb(el, i);
      orbs[i].x = newOrb.x;
      orbs[i].y = newOrb.y;
      orbs[i].ox = newOrb.ox;
      orbs[i].oy = newOrb.oy;
      orbs[i].vx = 0;
      orbs[i].vy = 0;
    });
  }, { passive: true });

  let mouse = { x: -9999, y: -9999, inside: false };
  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.inside = true;
  }, { passive: true });
  hero.addEventListener('mouseleave', () => { mouse.inside = false; });

  // Magnetic click effect with collision zone
  let magnet = { active: false, x: 0, y: 0 };
  let burstActive = false;
  let tabCollisionActive = false;    // Triggered by tab click
  const MAGNET_STR = 7.8;            // Very strong pull to center
  const TAB_MAGNET_STR = 32.0;       // Ultra-strong pull for instant convergence
  const COLLISION_RADIUS = 140;      // Area where orbs can collide at click point
  const BURST_STR = 50.0;            // Explosive magnetic repulsion on release
  const BURST_DURATION = 350;
  const COLLISION_TIME = 300;        // Time to converge on click (ms)
  const TAB_COLLISION_TIME = 200;    // Time to converge on tab hover (ms)
  const MOUSE_STR_BURST = 2.0;       // Strong mouse repulsion during burst

  // Start convergence on tab hover (no auto-burst)
  function startTabCollision(x, y) {
    tabCollisionActive = true;
    magnet.active = true;
    magnet.x = x;
    magnet.y = y;
    magnet.startTime = Date.now();
    magnet.tabTriggered = true;
    console.log(`%c[HOVER CONVERGE]`, 'color: #2dc8b0; font-weight: bold', `Magnet: (${x.toFixed(1)}, ${y.toFixed(1)})`);
  }

  // Reset collision on hover leave
  function stopTabCollision() {
    magnet.active = false;
    tabCollisionActive = false;
    console.log(`%c[HOVER LEAVE]`, 'color: #999; font-weight: bold');
  }

  // Apply burst on click
  function triggerTabBurst() {
    if (!magnet.active) return;
    magnet.active = false;
    tabCollisionActive = false;  // Expand orbs back to full size
    burstActive = true;
    setTimeout(() => { burstActive = false; }, BURST_DURATION);

    const burstForce = BURST_STR * 1.6;
    orbs.forEach(orb => {
      const dx = orb.x - magnet.x;
      const dy = orb.y - magnet.y;
      const d = Math.sqrt(dx*dx + dy*dy) || 1;
      orb.vx += (dx / d) * burstForce;
      orb.vy += (dy / d) * burstForce;
    });

    console.log(`%c[CLICK BURST]`, 'color: #8b6cf7; font-weight: bold', `Force: ${burstForce.toFixed(1)}`);
    magnet.tabTriggered = false;
  }

  hero.addEventListener('mousedown', e => {
    // Skip if mousedown is on a tab (handled by hover/click events instead)
    const clickedTab = e.target.closest('.audience-tab');
    if (clickedTab) return;

    const r = hero.getBoundingClientRect();
    magnet.active = true;
    magnet.x = e.clientX - r.left;
    magnet.y = e.clientY - r.top;
    magnet.startTime = Date.now();
    magnet.tabTriggered = false;
  });

  function applyBurst() {
    if (!magnet.active) return;
    magnet.active = false;
    burstActive = true;
    setTimeout(() => { burstActive = false; }, BURST_DURATION);

    // Use stronger burst for tab-triggered collisions
    const burstForce = magnet.tabTriggered ? BURST_STR * 1.6 : BURST_STR;

    orbs.forEach((orb, i) => {
      const dx = orb.x - magnet.x;
      const dy = orb.y - magnet.y;
      const d = Math.sqrt(dx*dx + dy*dy) || 1;
      const burstVx = (dx / d) * burstForce;
      const burstVy = (dy / d) * burstForce;
      orb.vx += burstVx;
      orb.vy += burstVy;
    });
    console.log(`%c[BURST RELEASE]`, 'color: #8b6cf7; font-weight: bold', {
      magnetPos: { x: magnet.x.toFixed(1), y: magnet.y.toFixed(1) },
      tabTriggered: magnet.tabTriggered,
      burstForce: burstForce.toFixed(1)
    });
  }

  window.addEventListener('mouseup', () => {
    // Only apply burst if not already handled by tab auto-burst
    if (!magnet.tabTriggered) {
      applyBurst();
    }
  });

  const DAMPING    = 0.990;
  const MAX_SPEED  = 3.5;
  const MOUSE_DIST = 260;
  const MOUSE_STR  = 0.6;
  const ORB_STR    = 3.0;
  const DRIFT_STR  = 0.004;
  let t = 0;
  const driftPhase = [0, 2.09, 4.18];

  function clampSpeed(orb) {
    const cap = (burstActive || magnet.active) ? MAX_SPEED * 6 : MAX_SPEED;
    const spd = Math.sqrt(orb.vx * orb.vx + orb.vy * orb.vy);
    if (spd > cap) { orb.vx = orb.vx/spd * cap; orb.vy = orb.vy/spd * cap; }
  }

  function tick() {
    t += 0.003;
    const { w, h } = heroSize();

    orbs.forEach((orb, i) => {
      // Floating state: each orb has a slightly different size (A=1.0, B=1.12, C=0.98)
      const floatingScale = i === 0 ? 1.0 : (i === 1 ? 1.12 : 0.98);
      // Update target scale: 0.5 during convergence, floating size otherwise
      orb.targetScale = tabCollisionActive ? 0.5 : floatingScale;
      // Smoothly animate scale toward target (lerp)
      orb.scale += (orb.targetScale - orb.scale) * 0.15;

      orb.vx += Math.cos(t * 0.6 + driftPhase[i]) * DRIFT_STR;
      orb.vy += Math.sin(t * 0.4 + driftPhase[i] + 1) * DRIFT_STR;

      // Magnet attraction on mousedown — pull to collision zone in COLLISION_TIME ms
      if (magnet.active) {
        const dx = magnet.x - orb.x;
        const dy = magnet.y - orb.y;
        const d = Math.sqrt(dx*dx + dy*dy) || 1;

        // Use different timings and strengths for tab-triggered vs manual clicks
        const collisionDuration = magnet.tabTriggered ? TAB_COLLISION_TIME : COLLISION_TIME;
        const baseMagnetStr = magnet.tabTriggered ? TAB_MAGNET_STR : MAGNET_STR;

        // Time-based scaling: ramp up force over collision duration
        const elapsed = Date.now() - magnet.startTime;
        const timeProgress = Math.min(elapsed / collisionDuration, 1);
        const timeScale = 1 + timeProgress * 2.2; // Aggressive acceleration for tab triggers

        // Very strong pull to center point, scaled by time
        const f = Math.min((baseMagnetStr * timeScale) / Math.max(d * 0.004, 1), baseMagnetStr * 2.2);
        orb.vx += (dx / d) * f;
        orb.vy += (dy / d) * f;

        // Prevent orbs from overshooting past collision zone — stronger repulsion from click point
        if (d < COLLISION_RADIUS && d > 0) {
          const repulsion = (1 - d / COLLISION_RADIUS) * (magnet.tabTriggered ? 1.0 : 0.6);
          orb.vx += (dx / d) * repulsion;
          orb.vy += (dy / d) * repulsion;
        }
      }

      if (mouse.inside) {
        const mdx = orb.x - mouse.x, mdy = orb.y - mouse.y;
        const md  = Math.sqrt(mdx*mdx + mdy*mdy);
        // Stronger repulsion during burst/dispersion phase
        const mouseStrength = burstActive ? MOUSE_STR_BURST : MOUSE_STR;
        const mouseDist = burstActive ? MOUSE_DIST * 1.5 : MOUSE_DIST;
        if (md < mouseDist && md > 0) {
          const f = (1 - md / mouseDist) * mouseStrength;
          orb.vx += (mdx / md) * f;
          orb.vy += (mdy / md) * f;
        }
      }

      orbs.forEach((other, j) => {
        if (i >= j) return;
        const dx = orb.x - other.x, dy = orb.y - other.y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        const min = orb.r * 0.5 + other.r * 0.5;
        if (d < min && d > 0) {
          const f = (1 - d / min) * ORB_STR;
          orb.vx   += (dx/d) * f;  orb.vy   += (dy/d) * f;
          other.vx -= (dx/d) * f;  other.vy -= (dy/d) * f;
        }
      });

      orb.vx *= DAMPING;
      orb.vy *= DAMPING;
      clampSpeed(orb);

      orb.x += orb.vx;
      orb.y += orb.vy;

      const margin = orb.r * 0.3;
      if (orb.x < -margin)     { orb.x = -margin;    orb.vx *= -0.6; }
      if (orb.x > w + margin)  { orb.x = w + margin; orb.vx *= -0.6; }
      if (orb.y < -margin)     { orb.y = -margin;    orb.vy *= -0.6; }
      if (orb.y > h + margin)  { orb.y = h + margin; orb.vy *= -0.6; }

      const dx = orb.x - orb.ox;
      const dy = orb.y - orb.oy;
      // Apply smoothly animated scale
      orb.el.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${orb.scale.toFixed(3)})`;
    });

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  // ── Audience tabs ──
  const copy = {
    anyone:      { h: 'Designer who makes complex things feel clear, alive, and worth using.',           s: 'Product design · creative technology · AI workflows.<br>Disney · Citrix · Life Force Academy.' },
    recruiters:  { h: 'Senior product designer with 15+ years across consumer, enterprise, and AI.',    s: 'Available for full-time roles. Based in Florida, open to remote.<br>Disney · Citrix · PwC · LFA.' },
    directors:   { h: 'Systems thinker who designs for scale, craft, and cross-functional clarity.',    s: 'I bring product thinking, visual precision, and team-enabling structure to design orgs.' },
    designers:   { h: 'Interface, motion, and generative systems — built with intent and good taste.',   s: 'From onboarding flows to AI creative pipelines. Always thinking about the layer beneath the layer.' },
    pms:         { h: 'A design partner who translates ambiguity into structured, shippable experiences.', s: 'I think in flows, edge cases, and outcomes — not just screens.' },
    engineers:   { h: 'Designer who specs clearly, prototypes in code, and respects the build.',        s: 'Comfortable in HTML/CSS/JS. I reduce handoff friction and think in components.' },
    'creative-ai': { h: 'I explore AI as part of the design process.',                                   s: 'Faster iteration. New ways to create.' },
  };

  // Monochromatic shade system (300=light, 500=base, 700=dark) for depth and cohesion
  const orbColors = {
    blue: {
      300: 'rgba(120,160,255,0.75)',  // Light tint
      500: 'rgba(80,120,240,0.9)',    // Base color (LFA case blue)
      700: 'rgba(40,80,200,0.9)',     // Dark shade
    },
    warm: {
      300: 'rgba(245,170,120,0.75)',  // Light tint
      500: 'rgba(224,92,40,0.9)',     // Base color
      700: 'rgba(180,50,20,0.9)',     // Dark shade
    },
    teal: {
      300: 'rgba(120,230,210,0.75)',  // Light tint
      500: 'rgba(45,200,178,0.95)',   // Base color
      700: 'rgba(15,130,110,0.9)',    // Dark shade
    },
    violet: {
      300: 'rgba(200,180,255,0.75)',  // Light tint
      500: 'rgba(139,108,247,0.9)',   // Base color
      700: 'rgba(80,50,200,0.9)',     // Dark shade
    },
  };

  const headline  = document.getElementById('hero-headline');
  const sub       = document.getElementById('hero-sub');
  const tabs      = document.querySelectorAll('.audience-tab');

  function updateOrbColors(colorScheme) {
    if (!orbEls.every(o => o)) return;
    const colors = orbColors[colorScheme];
    if (!colors) return;

    // Apply monochromatic shades to each orb: A=500 (base), B=300 (light), C=700 (dark)
    const shades = [colors[500], colors[300], colors[700]];
    const shadeNames = ['base', 'light', 'dark'];

    orbEls.forEach((orb, i) => {
      const primaryColor = shades[i];
      // Create semi-transparent secondary for glow effect (same hue, lower opacity)
      const gradient = `radial-gradient(ellipse at center, ${primaryColor} 0%, ${primaryColor.replace(/0\.\d+\)/, '0.3)')} 45%, transparent 70%)`;

      orb.style.transition = 'background 0.8s cubic-bezier(0.22, 1, 0.36, 1)';
      orb.style.background = gradient;
    });

    console.log(`%c[ORB COLORS]`, 'color: #2dc8b0; font-weight: bold', {
      scheme: colorScheme,
      orbA: 'base (500)',
      orbB: 'light (300)',
      orbC: 'dark (700)'
    });
  }

  // Initialize with blue colors (first tab)
  updateOrbColors('blue');

  let hoveredTab = null;
  let convergenceDone = false;

  tabs.forEach(tab => {
    // On hover: converge orbs (one-shot per tab hover)
    tab.addEventListener('mouseenter', (e) => {
      const isNewTab = hoveredTab !== tab;
      hoveredTab = tab;

      // Only converge once per hover interaction
      if (!convergenceDone || isNewTab) {
        // Calculate tab center point relative to hero container
        const tabRect = tab.getBoundingClientRect();
        const heroRect = hero.getBoundingClientRect();
        const centerX = tabRect.left - heroRect.left + tabRect.width / 2;
        const centerY = tabRect.top - heroRect.top + tabRect.height / 2;
        const color = tab.dataset.color;

        startTabCollision(centerX, centerY);
        updateOrbColors(color);
        convergenceDone = true;

        console.log(`%c[ONE-SHOT HOVER]`, 'color: #e05c28; font-weight: bold', `Tab: ${tab.dataset.audience}, Center: (${centerX.toFixed(1)}, ${centerY.toFixed(1)})`);
      }
    });

    // On leave: reset convergence flag
    tab.addEventListener('mouseleave', () => {
      if (hoveredTab === tab) {
        stopTabCollision();
        hoveredTab = null;
        convergenceDone = false;
      }
    });

    // On click: burst and update UI
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('audience-tab--active'));
      tab.classList.add('audience-tab--active');
      const key = tab.dataset.audience;

      // Trigger burst dispersion
      triggerTabBurst();

      // Update copy
      if (headline) { headline.style.opacity = '0'; headline.style.transform = 'translateY(8px)'; setTimeout(() => { headline.textContent = copy[key].h; headline.style.opacity = '1'; headline.style.transform = 'translateY(0)'; }, 200); }
      if (sub)      { sub.style.opacity = '0'; setTimeout(() => { sub.innerHTML = copy[key].s; sub.style.opacity = '1'; }, 250); }
    });
  });

  if (headline) headline.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  if (sub)      sub.style.transition = 'opacity 0.3s ease';
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

// ── Scroll reveals ──
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ── Hero: cinematic title reveal — word-wrap line split ──
(function () {
  const h1 = document.querySelector('#hero h1');
  if (!h1) return;

  const words = h1.textContent.trim().split(/\s+/);
  h1.innerHTML = words.map(w =>
    `<span class="hero-word" style="display:inline-block;overflow:hidden;vertical-align:bottom"><span class="hero-line-inner" style="display:inline-block">${w}&nbsp;</span></span>`
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


// ── Artifact tile hover: label reveal ──
document.querySelectorAll('.artifact-tile').forEach(tile => {
  const label = tile.querySelector('.artifact-label');
  if (!label) return;
  tile.addEventListener('mouseenter', () => {
    label.style.opacity = '1';
    label.style.transform = 'translateY(0)';
    label.style.color = 'rgba(242,240,235,0.6)';
  });
  tile.addEventListener('mouseleave', () => {
    label.style.opacity = '0';
    label.style.transform = 'translateY(4px)';
    label.style.color = 'rgba(242,240,235,0)';
  });
});
