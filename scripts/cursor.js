(() => {
  'use strict';

  // Only for devices with a real, hover-capable, fine-pointer mouse, and
  // only when the person hasn't asked for reduced motion. Everyone else
  // keeps the plain system cursor — nothing else in this file runs.
  const supportsCustomCursor = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!supportsCustomCursor || reduceMotion) return;

  // Guard against double-initialization (e.g. the script being included
  // twice by accident, or a bfcache page restore re-running it) — never
  // create a second set of cursor elements or a second set of listeners.
  if (document.body.classList.contains('has-custom-cursor')) return;

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
  let suspended = false;
  let rafId = null;

  const RING_EASE = 0.18; // slight easing — a light follow, not a heavy trail
  const HOVER_SELECTOR = 'a, button, [role="button"], .exp-card, .case-card, .cert-card, .proof-card, .cs-screen, .cs-gallery-item, input, textarea';

  // Every listener is a named function (not an inline arrow passed
  // straight to addEventListener) specifically so it can be genuinely
  // removed later, not just short-circuited with an if-check.
  function onMouseMove(e) {
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
  }
  function onMouseLeaveDoc() {
    document.body.classList.add('cursor-hidden');
    // A real browser quirk, not specific to this cursor system: when
    // the pointer moves from over a hover-reactive element directly
    // out of the window (to browser chrome, another app, etc.), the
    // final mouseout needed to clear that element's :hover state can
    // fail to fire — :hover is cleared by movement targeting away from
    // the element, which never happens if the cursor just leaves the
    // rendering surface. Confirmed directly: `element.matches(':hover')`
    // still returns true after a genuine document-level mouseleave.
    // Fixed with the standard technique for this — briefly making the
    // whole page unhoverable forces the browser to invalidate every
    // :hover match immediately, then normal interaction resumes next
    // frame once a real mouse position is known again.
    document.body.style.pointerEvents = 'none';
    requestAnimationFrame(() => {
      document.body.style.pointerEvents = '';
    });
  }
  function onMouseEnterDoc() { if (hasPositioned) document.body.classList.remove('cursor-hidden'); }
  function onMouseOver(e) {
    if (e.target.closest && e.target.closest(HOVER_SELECTOR)) ring.classList.add('is-hovering');
  }
  function onMouseOut(e) {
    const stillInside = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(HOVER_SELECTOR);
    if (e.target.closest && e.target.closest(HOVER_SELECTOR) && !stillInside) ring.classList.remove('is-hovering');
  }
  function onMouseDown() { dot.classList.add('is-clicking'); ring.classList.add('is-clicking'); }
  function onMouseUp() { dot.classList.remove('is-clicking'); ring.classList.remove('is-clicking'); }

  function addAllListeners() {
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeaveDoc);
    document.addEventListener('mouseenter', onMouseEnterDoc);
    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseout', onMouseOut);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
  }
  function removeAllListeners() {
    window.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseleave', onMouseLeaveDoc);
    document.removeEventListener('mouseenter', onMouseEnterDoc);
    document.removeEventListener('mouseover', onMouseOver);
    document.removeEventListener('mouseout', onMouseOut);
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
  }

  function tick() {
    ringX += (mouseX - ringX) * RING_EASE;
    ringY += (mouseY - ringY) * RING_EASE;
    ringWrap.style.setProperty('--cx', `${ringX}px`);
    ringWrap.style.setProperty('--cy', `${ringY}px`);
    rafId = requestAnimationFrame(tick);
  }

  // Public API: a real suspend, not a visual mask. Removes every
  // listener outright and cancels the animation frame loop so nothing
  // is computing or dispatching while suspended — not just hidden with
  // opacity while still running underneath. Called by the password
  // gate (or anything else that opens a true modal) while it's open.
  function suspend() {
    if (suspended) return;
    suspended = true;
    removeAllListeners();
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    ring.classList.remove('is-hovering', 'is-clicking');
    dot.classList.remove('is-clicking');
    document.body.classList.add('cursor-hidden');
    // Full unmount, not a hide: actually removed from the document.
    // An element that doesn't exist in the DOM cannot render above
    // anything, cannot be hit-tested, cannot be part of any stacking
    // context — there is no stronger guarantee than this.
    if (dotWrap.isConnected) dotWrap.remove();
    if (ringWrap.isConnected) ringWrap.remove();
  }

  function resume() {
    if (!suspended) return;
    suspended = false;
    if (!dotWrap.isConnected) document.body.appendChild(dotWrap);
    if (!ringWrap.isConnected) document.body.appendChild(ringWrap);
    addAllListeners();
    if (hasPositioned) document.body.classList.remove('cursor-hidden');
    rafId = requestAnimationFrame(tick);
  }

  window.portfolioCursor = { suspend, resume };

  addAllListeners();
  rafId = requestAnimationFrame(tick);
})();
