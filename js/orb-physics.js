// ── Orb field physics — reusable section background system ──
(function () {
  const orbColors = {
    blue: {
      300: 'rgba(120,160,255,0.75)',
      500: 'rgba(80,120,240,0.9)',
      700: 'rgba(40,80,200,0.9)',
    },
    warm: {
      300: 'rgba(245,170,120,0.75)',
      500: 'rgba(224,92,40,0.9)',
      700: 'rgba(180,50,20,0.9)',
    },
    teal: {
      300: 'rgba(120,230,210,0.75)',
      500: 'rgba(45,200,178,0.95)',
      700: 'rgba(15,130,110,0.9)',
    },
    violet: {
      300: 'rgba(200,180,255,0.75)',
      500: 'rgba(139,108,247,0.9)',
      700: 'rgba(80,50,200,0.9)',
    },
  };

  const heroCopy = {
    anyone: { h: 'Designer who makes complex things feel clear, alive, and worth using.', s: 'Product design · creative technology · AI workflows.<br>Disney · Citrix · Life Force Academy.' },
    recruiters: { h: 'Senior product designer with 15+ years across consumer, enterprise, and AI.', s: 'Available for full-time roles. Based in Florida, open to remote.<br>Disney · Citrix · PwC · LFA.' },
    directors: { h: 'Systems thinker who designs for scale, craft, and cross-functional clarity.', s: 'I bring product thinking, visual precision, and team-enabling structure to design orgs.' },
    designers: { h: 'Interface, motion, and generative systems — built with intent and good taste.', s: 'From onboarding flows to AI creative pipelines. Always thinking about the layer beneath the layer.' },
    pms: { h: 'A design partner who translates ambiguity into structured, shippable experiences.', s: 'I think in flows, edge cases, and outcomes — not just screens.' },
    engineers: { h: 'Designer who specs clearly, prototypes in code, and respects the build.', s: 'Comfortable in HTML/CSS/JS. I reduce handoff friction and think in components.' },
    'creative-ai': { h: 'I explore AI as part of the design process.', s: 'Faster iteration. New ways to create.' },
  };

  function withAlpha(color, alpha) {
    return color.replace(/[\d.]+\)$/, `${alpha})`);
  }

  function updateOrbColors(orbEls, colorScheme) {
    const colors = orbColors[colorScheme];
    if (!colors || orbEls.some((orb) => !orb)) return;

    const shades = [colors[500], colors[300], colors[700]];
    orbEls.forEach((orb, i) => {
      const primaryColor = shades[i];
      const gradient = `radial-gradient(ellipse at center, ${primaryColor} 0%, ${withAlpha(primaryColor, 0.3)} 45%, transparent 70%)`;
      orb.style.transition = 'background 0.8s cubic-bezier(0.22, 1, 0.36, 1)';
      orb.style.background = gradient;
    });
  }

  function initOrbField(field) {
    const orbEls = [
      field.querySelector('.orb-field__orb--a'),
      field.querySelector('.orb-field__orb--b'),
      field.querySelector('.orb-field__orb--c'),
    ];
    if (orbEls.some((orb) => !orb)) return;

    const isHeroField = field.dataset.orbMode === 'hero-tabs';
    const palette = field.dataset.orbPalette || 'blue';

    function fieldSize() {
      return { w: field.offsetWidth, h: field.offsetHeight };
    }

    function initOrb(el) {
      const er = el.getBoundingClientRect();
      const fr = field.getBoundingClientRect();
      const cx = er.left - fr.left + er.width / 2;
      const cy = er.top - fr.top + er.height / 2;
      const r = Math.max(er.width, er.height) / 2;
      const spd = 0.3 + Math.random() * 0.4;
      const ang = Math.random() * Math.PI * 2;

      return {
        x: cx,
        y: cy,
        r,
        el,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        ox: cx,
        oy: cy,
        scale: 1.0,
        targetScale: 1.0,
      };
    }

    const orbs = orbEls.map(initOrb);
    let mouse = { x: -9999, y: -9999, inside: false };
    let magnet = { active: false, x: 0, y: 0, startTime: 0, tabTriggered: false };
    let burstActive = false;
    let tabCollisionActive = false;
    let t = 0;
    const driftPhase = [0, 2.09, 4.18];

    const DAMPING = 0.99;
    const MAX_SPEED = 3.5;
    const MOUSE_DIST = 260;
    const MOUSE_STR = 0.6;
    const ORB_STR = 3.0;
    const DRIFT_STR = 0.004;
    const MAGNET_STR = 7.8;
    const TAB_MAGNET_STR = 32.0;
    const COLLISION_RADIUS = 140;
    const BURST_STR = 50.0;
    const BURST_DURATION = 350;
    const COLLISION_TIME = 300;
    const TAB_COLLISION_TIME = 200;
    const MOUSE_STR_BURST = 2.0;

    function resetOrbOrigins() {
      orbEls.forEach((el, i) => {
        const nextOrb = initOrb(el);
        orbs[i].x = nextOrb.x;
        orbs[i].y = nextOrb.y;
        orbs[i].ox = nextOrb.ox;
        orbs[i].oy = nextOrb.oy;
        orbs[i].r = nextOrb.r;
        orbs[i].vx = 0;
        orbs[i].vy = 0;
      });
    }

    function clampSpeed(orb) {
      const cap = (burstActive || magnet.active) ? MAX_SPEED * 6 : MAX_SPEED;
      const spd = Math.sqrt(orb.vx * orb.vx + orb.vy * orb.vy);
      if (spd > cap) {
        orb.vx = (orb.vx / spd) * cap;
        orb.vy = (orb.vy / spd) * cap;
      }
    }

    function startMagnet(x, y, tabTriggered) {
      magnet.active = true;
      magnet.x = x;
      magnet.y = y;
      magnet.startTime = Date.now();
      magnet.tabTriggered = tabTriggered;
      tabCollisionActive = tabTriggered;
    }

    function stopTabCollision() {
      magnet.active = false;
      magnet.tabTriggered = false;
      tabCollisionActive = false;
    }

    function applyBurst(forceMultiplier) {
      if (!magnet.active) return;
      magnet.active = false;
      tabCollisionActive = false;
      burstActive = true;

      setTimeout(() => {
        burstActive = false;
      }, BURST_DURATION);

      const burstForce = BURST_STR * forceMultiplier;
      orbs.forEach((orb) => {
        const dx = orb.x - magnet.x;
        const dy = orb.y - magnet.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        orb.vx += (dx / d) * burstForce;
        orb.vy += (dy / d) * burstForce;
      });

      magnet.tabTriggered = false;
    }

    field.addEventListener('mousemove', (e) => {
      const r = field.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.inside = true;
    }, { passive: true });

    field.addEventListener('mouseleave', () => {
      mouse.inside = false;
      if (!isHeroField) {
        magnet.active = false;
      }
    });

    field.addEventListener('mousedown', (e) => {
      if (e.target.closest('a, button, input, textarea, select, label')) return;
      const r = field.getBoundingClientRect();
      startMagnet(e.clientX - r.left, e.clientY - r.top, false);
    });

    window.addEventListener('mouseup', () => {
      if (!magnet.active || magnet.tabTriggered) return;
      applyBurst(1);
    });

    window.addEventListener('resize', resetOrbOrigins, { passive: true });

    function tick() {
      t += 0.003;
      const { w, h } = fieldSize();

      orbs.forEach((orb, i) => {
        const floatingScale = i === 0 ? 1.0 : (i === 1 ? 1.12 : 0.98);
        orb.targetScale = tabCollisionActive ? 0.5 : floatingScale;
        orb.scale += (orb.targetScale - orb.scale) * 0.15;

        orb.vx += Math.cos(t * 0.6 + driftPhase[i]) * DRIFT_STR;
        orb.vy += Math.sin(t * 0.4 + driftPhase[i] + 1) * DRIFT_STR;

        if (magnet.active) {
          const dx = magnet.x - orb.x;
          const dy = magnet.y - orb.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const collisionDuration = magnet.tabTriggered ? TAB_COLLISION_TIME : COLLISION_TIME;
          const baseMagnetStr = magnet.tabTriggered ? TAB_MAGNET_STR : MAGNET_STR;
          const elapsed = Date.now() - magnet.startTime;
          const timeProgress = Math.min(elapsed / collisionDuration, 1);
          const timeScale = 1 + timeProgress * 2.2;
          const f = Math.min((baseMagnetStr * timeScale) / Math.max(d * 0.004, 1), baseMagnetStr * 2.2);

          orb.vx += (dx / d) * f;
          orb.vy += (dy / d) * f;

          if (d < COLLISION_RADIUS && d > 0) {
            const repulsion = (1 - d / COLLISION_RADIUS) * (magnet.tabTriggered ? 1.0 : 0.6);
            orb.vx += (dx / d) * repulsion;
            orb.vy += (dy / d) * repulsion;
          }
        }

        if (mouse.inside) {
          const mdx = orb.x - mouse.x;
          const mdy = orb.y - mouse.y;
          const md = Math.sqrt(mdx * mdx + mdy * mdy);
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
          const dx = orb.x - other.x;
          const dy = orb.y - other.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const min = orb.r * 0.5 + other.r * 0.5;

          if (d < min && d > 0) {
            const f = (1 - d / min) * ORB_STR;
            orb.vx += (dx / d) * f;
            orb.vy += (dy / d) * f;
            other.vx -= (dx / d) * f;
            other.vy -= (dy / d) * f;
          }
        });

        orb.vx *= DAMPING;
        orb.vy *= DAMPING;
        clampSpeed(orb);

        orb.x += orb.vx;
        orb.y += orb.vy;

        const margin = orb.r * 0.3;
        if (orb.x < -margin) { orb.x = -margin; orb.vx *= -0.6; }
        if (orb.x > w + margin) { orb.x = w + margin; orb.vx *= -0.6; }
        if (orb.y < -margin) { orb.y = -margin; orb.vy *= -0.6; }
        if (orb.y > h + margin) { orb.y = h + margin; orb.vy *= -0.6; }

        const dx = orb.x - orb.ox;
        const dy = orb.y - orb.oy;
        orb.el.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${orb.scale.toFixed(3)})`;
      });

      requestAnimationFrame(tick);
    }

    updateOrbColors(orbEls, palette);

    if (isHeroField) {
      const headline = field.querySelector('#hero-headline');
      const sub = field.querySelector('#hero-sub');
      const tabs = field.querySelectorAll('.audience-tab');
      let hoveredTab = null;
      let convergenceDone = false;

      tabs.forEach((tab) => {
        tab.addEventListener('mouseenter', () => {
          const isNewTab = hoveredTab !== tab;
          hoveredTab = tab;

          if (!convergenceDone || isNewTab) {
            const tabRect = tab.getBoundingClientRect();
            const fieldRect = field.getBoundingClientRect();
            const centerX = tabRect.left - fieldRect.left + tabRect.width / 2;
            const centerY = tabRect.top - fieldRect.top + tabRect.height / 2;

            startMagnet(centerX, centerY, true);
            updateOrbColors(orbEls, tab.dataset.color || palette);
            convergenceDone = true;
          }
        });

        tab.addEventListener('mouseleave', () => {
          if (hoveredTab !== tab) return;
          stopTabCollision();
          hoveredTab = null;
          convergenceDone = false;
        });

        tab.addEventListener('click', () => {
          const key = tab.dataset.audience;
          tabs.forEach((currentTab) => currentTab.classList.remove('audience-tab--active'));
          tab.classList.add('audience-tab--active');
          applyBurst(1.6);

          if (headline && heroCopy[key]) {
            headline.style.opacity = '0';
            headline.style.transform = 'translateY(8px)';
            setTimeout(() => {
              headline.textContent = heroCopy[key].h;
              headline.style.opacity = '1';
              headline.style.transform = 'translateY(0)';
            }, 200);
          }

          if (sub && heroCopy[key]) {
            sub.style.opacity = '0';
            setTimeout(() => {
              sub.innerHTML = heroCopy[key].s;
              sub.style.opacity = '1';
            }, 250);
          }
        });
      });

      if (headline) {
        headline.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      }

      if (sub) {
        sub.style.transition = 'opacity 0.3s ease';
      }
    }

    requestAnimationFrame(tick);
  }

  document.querySelectorAll('[data-orb-field]').forEach(initOrbField);
}());
