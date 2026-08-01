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
  const dialog = gate.querySelector('.cs-gate-dialog');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function lockPage() {
    document.body.classList.add('cs-gate-locked');
    // Fully suspend the custom cursor — not just hide it — while the
    // modal is open: cancels its rAF loop and removes its listeners
    // outright, rather than letting them keep running underneath a
    // visual mask. Guarded because cursor.js only exposes this API on
    // devices where it actually initialized (a real mouse, no reduced
    // motion); harmless no-op everywhere else.
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

  // Password visibility toggle
  toggleBtn.addEventListener('click', () => {
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    toggleBtn.classList.toggle('is-visible', !showing);
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
