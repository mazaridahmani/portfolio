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
      const email = 'hello@mazaridahmani.design';
      try {
        await navigator.clipboard.writeText(email);
        showToast('Email copied to clipboard');
      } catch {
        showToast(email);
      }
    });
  }

  // Contact form — no backend, so hand off to the user's mail client
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const message = form.message.value.trim();
      const subject = encodeURIComponent(`Project inquiry from ${name || 'website visitor'}`);
      const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
      window.location.href = `mailto:hello@mazaridahmani.design?subject=${subject}&body=${body}`;
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
