(() => {
  'use strict';

  // ACTION: change this to update the password. This is a soft,
  // client-side gate — the case study markup is already present in the
  // page behind it, so this is a polite "not public yet" ask, not real
  // access control. Fine for an unreleased-work placeholder; not a
  // substitute for real auth if this ever needs to protect anything
  // sensitive.
  const GATE_PASSWORD = 'Mazari@2002';
  const SESSION_KEY = 'mpay_case_study_unlocked';
  const CLOSE_DESTINATION = 'index.html#work';

  const gate = document.getElementById('cs-gate');
  if (!gate) return;

  const form = document.getElementById('cs-gate-form');
  const field = document.getElementById('cs-gate-field');
  const input = document.getElementById('cs-gate-input');
  const errorEl = document.getElementById('cs-gate-error');
  const submitBtn = document.getElementById('cs-gate-submit');
  const closeBtn = document.getElementById('cs-gate-close');
  const toggleBtn = document.getElementById('cs-gate-toggle');
  const eyeIcon = document.getElementById('cs-gate-eye-icon');
  const dialog = gate.querySelector('.cs-gate-dialog');

  // A single SVG element with its content swapped via JS, rather than
  // two SVG siblings toggled with display:none — the latter triggered
  // a real, confirmed browser layout bug where the flex container
  // computed the visible icon's width incorrectly (non-square
  // rendering) at initial page load specifically. Swapping content on
  // one persistent element sidesteps it entirely.
  const EYE_PATHS = '<path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M12.153 3.802c3.734.067 7.309 2.237 9.228 6.14a4.79 4.79 0 0 1 0 4.217c-1.92 3.902-5.494 6.072-9.228 6.14c-3.75.067-7.427-1.99-9.532-6.003a4.84 4.84 0 0 1 0-4.492c2.105-4.013 5.781-6.07 9.532-6.002m-7.761 6.932c3.545-6.759 11.99-6.425 15.195.09c.379.77.379 1.681 0 2.452c-3.205 6.515-11.65 6.849-15.195.09a2.84 2.84 0 0 1 0-2.632"/><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M15.7 12.05a3.75 3.75 0 1 1-7.5 0a3.75 3.75 0 0 1 7.5 0m-3.75 1.75a1.75 1.75 0 1 0 0-3.5a1.75 1.75 0 0 0 0 3.5"/>';
  const EYE_OFF_PATHS = '<path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" opacity="0.35" d="M12.153 3.802c3.734.067 7.309 2.237 9.228 6.14a4.79 4.79 0 0 1 0 4.217c-1.92 3.902-5.494 6.072-9.228 6.14c-3.75.067-7.427-1.99-9.532-6.003a4.84 4.84 0 0 1 0-4.492c2.105-4.013 5.781-6.07 9.532-6.002m-7.761 6.932c3.545-6.759 11.99-6.425 15.195.09c.379.77.379 1.681 0 2.452c-3.205 6.515-11.65 6.849-15.195.09a2.84 2.84 0 0 1 0-2.632"/><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" opacity="0.35" d="M15.7 12.05a3.75 3.75 0 1 1-7.5 0a3.75 3.75 0 0 1 7.5 0m-3.75 1.75a1.75 1.75 0 1 0 0-3.5a1.75 1.75 0 0 0 0 3.5"/><path stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M3.5 3.5l17 17"/>';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function lockPage() {
    document.body.classList.add('cs-gate-locked');
    // The custom cursor is fully disabled while the gate is open — not
    // hidden, not suspended-but-present: genuinely unmounted from the
    // DOM, its listeners removed, its animation loop cancelled, and
    // the native browser cursor restored everywhere (auto on the page,
    // text on the password input, pointer on buttons). Scoped only to
    // this page's protected state — everywhere else on the portfolio
    // keeps the custom cursor exactly as before. Guarded because
    // cursor.js only exposes this API on devices where it actually
    // initialized (a real mouse, no reduced motion); harmless no-op
    // everywhere else.
    if (window.portfolioCursor) window.portfolioCursor.suspend();
    // The real mechanism: `inert` is a native DOM attribute, not a CSS
    // trick — it makes an element and its entire subtree unclickable,
    // unhoverable, unfocusable, and invisible to the accessibility
    // tree, all at once, with no cascade/specificity for anything to
    // fight against. This is what native <dialog> and every real modal
    // library (Radix, Headless UI, shadcn) relies on or polyfills.
    // Applied to every direct child of body except the gate itself —
    // the gate markup already lives at the end of <body>, so it's
    // already effectively "portaled" above the rest of the page in
    // the DOM; inert is what makes that page actually unreachable.
    Array.from(document.body.children).forEach((el) => {
      if (el !== gate) el.setAttribute('inert', '');
    });
    gate.removeAttribute('hidden');
    requestAnimationFrame(() => {
      gate.classList.add('is-open');
      input.focus();
    });
    document.addEventListener('keydown', onKeydown);
  }

  function unlockPage(skipAnimation) {
    document.body.classList.remove('cs-gate-locked');
    Array.from(document.body.children).forEach((el) => {
      if (el !== gate) el.removeAttribute('inert');
    });
    // Restores the custom cursor exactly as it was — remounted,
    // listeners reattached, animation loop restarted — instantly, with
    // no fade (handled inside resume() itself).
    if (window.portfolioCursor) window.portfolioCursor.resume();
    document.removeEventListener('keydown', onKeydown);
    if (skipAnimation) {
      gate.setAttribute('hidden', '');
      return;
    }
    gate.classList.add('is-closing');
    const done = () => {
      gate.setAttribute('hidden', '');
      gate.classList.remove('is-open', 'is-closing');
    };
    if (reduceMotion) {
      done();
    } else {
      gate.addEventListener('transitionend', done, { once: true });
      // safety fallback in case transitionend doesn't fire for some reason
      setTimeout(done, 500);
    }
  }

  function showError(message) {
    errorEl.textContent = message;
    field.classList.add('has-error');
    dialog.classList.remove('is-shaking');
    // restart the shake animation even on repeated wrong attempts
    void dialog.offsetWidth;
    dialog.classList.add('is-shaking');
    input.value = '';
    input.focus();
  }

  // Close ≠ unlock. Leaving the page entirely, same destination as the
  // page's own "Back to Portfolio" link — never reveals the gated content.
  function closeGate() {
    window.location.href = CLOSE_DESTINATION;
  }

  closeBtn.addEventListener('click', closeGate);

  // Password visibility toggle. Focus is prevented from ever leaving
  // the input in the first place — preventDefault on mousedown stops
  // the button from taking focus at all (the default browser behavior
  // for a button click), rather than letting focus jump away and then
  // calling input.focus() to pull it back a moment later.
  toggleBtn.addEventListener('mousedown', (e) => e.preventDefault());
  toggleBtn.addEventListener('click', () => {
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    eyeIcon.innerHTML = showing ? EYE_PATHS : EYE_OFF_PATHS;
    toggleBtn.setAttribute('aria-pressed', String(!showing));
    toggleBtn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    input.focus();
  });

  // Focus trap: Tab/Shift+Tab cycle only through the dialog's own
  // focusable elements while the gate is open, and Esc closes (leaves
  // the page) rather than unlocking.
  function getFocusable() {
    return Array.from(
      dialog.querySelectorAll('button, input, [href], [tabindex]:not([tabindex="-1"])')
    ).filter((el) => !el.disabled && el.offsetParent !== null);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeGate();
      return;
    }
    if (e.key !== 'Tab') return;

    const focusable = getFocusable();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  input.addEventListener('input', () => {
    field.classList.remove('has-error');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitBtn.disabled) return;

    submitBtn.disabled = true;
    input.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Verifying…';

    // Brief, deliberate pause so the loading state is actually visible —
    // the check itself is instant, but a flash of "Verifying…" reads as
    // broken rather than reassuring.
    await new Promise((resolve) => setTimeout(resolve, 550));

    if (input.value === GATE_PASSWORD) {
      try {
        sessionStorage.setItem(SESSION_KEY, 'true');
      } catch (err) {
        /* sessionStorage unavailable (private browsing etc.) — fine,
           the gate will just reappear on the next page load */
      }
      unlockPage(false);
    } else {
      showError('Incorrect password. Please try again.');
      submitBtn.disabled = false;
      input.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

  // Already unlocked earlier this session — skip the gate entirely,
  // no flash of the dialog before it's dismissed.
  let alreadyUnlocked = false;
  try {
    alreadyUnlocked = sessionStorage.getItem(SESSION_KEY) === 'true';
  } catch (err) {
    alreadyUnlocked = false;
  }

  if (alreadyUnlocked) {
    gate.setAttribute('hidden', '');
  } else {
    lockPage();
  }
})();
