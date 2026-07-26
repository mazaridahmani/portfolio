(() => {
  'use strict';

  // Only for devices with a real, hover-capable, fine-pointer mouse, and
  // only when the person hasn't asked for reduced motion. Everyone else
  // keeps the plain system cursor — nothing else in this file runs.
  const supportsCustomCursor = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!supportsCustomCursor || reduceMotion) return;

  // Structure: a "wrap" element handles position only (updated every
  // frame via a custom property, no CSS transition on it — so it never
  // fights the hover/click scale transitions), and an inner dot/ring
  // handles the visual size/scale changes.
  const dotWrap = document.createElement('div');
  dotWrap.className = 'cursor-dot-wrap';
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  dotWrap.appendChild(dot);

  const ringWrap = document.createElement('div');
  ringWrap.className = 'cursor-ring-wrap';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ringWrap.appendChild(ring);

  document.body.append(dotWrap, ringWrap);
  document.body.classList.add('has-custom-cursor', 'cursor-hidden');

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;
  let hasPositioned = false;

  const RING_EASE = 0.18; // slight easing — a light follow, not a heavy trail

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dotWrap.style.setProperty('--cx', `${mouseX}px`);
    dotWrap.style.setProperty('--cy', `${mouseY}px`);
    if (!hasPositioned) {
      ringX = mouseX;
      ringY = mouseY;
      hasPositioned = true;
      document.body.classList.remove('cursor-hidden');
    }
  }, { passive: true });

  document.addEventListener('mouseleave', () => document.body.classList.add('cursor-hidden'));
  document.addEventListener('mouseenter', () => { if (hasPositioned) document.body.classList.remove('cursor-hidden'); });

  // Slight enlarge on interactive elements — buttons, links, cards.
  const HOVER_SELECTOR = 'a, button, [role="button"], .exp-card, .case-card, .cert-card, .proof-card, .cs-screen, .cs-gallery-item, input, textarea';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest && e.target.closest(HOVER_SELECTOR)) ring.classList.add('is-hovering');
  });
  document.addEventListener('mouseout', (e) => {
    const stillInside = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(HOVER_SELECTOR);
    if (e.target.closest && e.target.closest(HOVER_SELECTOR) && !stillInside) ring.classList.remove('is-hovering');
  });

  // Click: quick shrink in, then the CSS's overshoot easing bounces it
  // back out on release — see .cursor-ring's base transition in cursor.css.
  window.addEventListener('mousedown', () => { dot.classList.add('is-clicking'); ring.classList.add('is-clicking'); });
  window.addEventListener('mouseup', () => { dot.classList.remove('is-clicking'); ring.classList.remove('is-clicking'); });

  const tick = () => {
    ringX += (mouseX - ringX) * RING_EASE;
    ringY += (mouseY - ringY) * RING_EASE;
    ringWrap.style.setProperty('--cx', `${ringX}px`);
    ringWrap.style.setProperty('--cy', `${ringY}px`);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
