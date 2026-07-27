(() => {
  'use strict';

  // Live clock for Algeria (Africa/Algiers) — the Figma mock shows a frozen
  // "23:48 DZ"; a static time reads as a bug once the page is live, so this
  // is rendered as a real clock instead. Flagged as an intentional deviation.
  const timeEl = document.getElementById('local-time');
  function updateClock() {
    if (!timeEl) return;
    const parts = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Africa/Algiers',
    }).format(new Date());
    timeEl.textContent = `${parts} DZ`;
  }
  updateClock();
  setInterval(updateClock, 30000);

  // Copy email to clipboard
  const copyBtn = document.getElementById('copy-email');
  const toast = document.getElementById('toast');
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 1800);
  }
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const email = 'uimazari@gmail.com';
      try {
        await navigator.clipboard.writeText(email);
        showToast('Email copied to clipboard');
      } catch {
        showToast(email);
      }
    });
  }

  // Contact form — sends via Formspree (https://formspree.io). Submits with
  // fetch() and Accept: application/json so Formspree returns JSON instead
  // of redirecting to its default "thanks" page — the page never navigates
  // away. The endpoint is read from the form's own action attribute, so
  // there's a single source of truth for it (also means the form still
  // works via a normal browser POST if JS ever fails to load).
  const form = document.getElementById('contact-form');
  const formStatus = document.getElementById('form-status');

  function setFormStatus(type, message) {
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.classList.remove('is-success', 'is-error');
    if (type) formStatus.classList.add(type === 'success' ? 'is-success' : 'is-error');
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Required-field validation. e.preventDefault() above suppresses the
      // browser's native validation UI, so it's re-triggered explicitly —
      // reportValidity() both blocks submission on invalid fields AND shows
      // the same built-in validation bubbles the browser would show anyway.
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      const formData = new FormData(form);

      setFormStatus(null, '');
      submitBtn.disabled = true;
      const originalLabel = submitBtn.textContent;
      submitBtn.textContent = 'Sending…';

      try {
        const response = await fetch(form.action, {
          method: form.method || 'POST',
          headers: { Accept: 'application/json' },
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.errors?.map((err) => err.message).join(', ') || 'Request failed');
        }

        setFormStatus('success', 'Your message has been sent successfully.');
        form.reset();
      } catch (err) {
        setFormStatus('error', "Something went wrong — please email me directly instead.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    });
  }

  // Paper airplane — quiet, premium motion: a slow idle float always
  // playing, plus a soft parallax/tilt toward the cursor while it's over
  // the contact panel, easing smoothly back to rest on mouseleave.
  // Skipped entirely for prefers-reduced-motion.
  const plane = document.getElementById('contact-plane');
  const planeWrap = document.getElementById('plane-wrap');
  const planeZone = document.querySelector('.contact-panel');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (plane && planeWrap && planeZone && !reduceMotion) {
    const MAX_TRANSLATE = 10; // px, cursor-parallax range
    const MAX_ROTATE = 7;     // deg, cursor-tilt range
    const EASE = 0.07;        // lerp factor: lower = slower, smoother follow/return

    let targetX = 0, targetY = 0, targetR = 0;
    let curX = 0, curY = 0, curR = 0;

    planeZone.addEventListener('mousemove', (e) => {
      const zoneRect = planeZone.getBoundingClientRect();
      const wrapRect = planeWrap.getBoundingClientRect();
      const cx = wrapRect.left + wrapRect.width / 2;
      const cy = wrapRect.top + wrapRect.height / 2;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / (zoneRect.width / 2)));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / (zoneRect.height / 2)));
      targetX = dx * MAX_TRANSLATE;
      targetY = dy * MAX_TRANSLATE * 0.6;
      targetR = dx * MAX_ROTATE;
    });

    planeZone.addEventListener('mouseleave', () => {
      targetX = 0;
      targetY = 0;
      targetR = 0;
    });

    const tick = (t) => {
      const idleY = Math.sin(t * 0.0009) * 4;
      const idleR = Math.sin(t * 0.0006) * 1.3;

      curX += (targetX - curX) * EASE;
      curY += (targetY - curY) * EASE;
      curR += (targetR - curR) * EASE;

      plane.style.transform =
        `translate3d(${curX.toFixed(2)}px, ${(curY + idleY).toFixed(2)}px, 0) rotate(${(curR + idleR).toFixed(2)}deg)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
})();
