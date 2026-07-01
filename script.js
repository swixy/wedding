// URL веб-приложения Google Apps Script (см. google-apps-script/Code.gs)
const FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwWOJJocjzDYLEXwJIKV081JG_QspMnfniar_igGlZ5PBkIkx3bK7zAUvyOgGHnuAa8/exec';

const HERO_TRANSITION_MS = 920;
const HERO_SWIPE_MIN = 28;

function initHero() {
  const heroShell = document.getElementById('hero-shell');
  const scrollEl = document.getElementById('site-scroll');
  const continueBtn = document.getElementById('hero-continue');

  if (!heroShell || !scrollEl) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const transitionMs = reduceMotion ? 180 : HERO_TRANSITION_MS;

  let heroOpen = true;
  let isAnimating = false;
  let heroTouchStartY = 0;
  let restoreTouchStartY = 0;
  let heroTouchHandled = false;
  let restoreTouchHandled = false;

  const applyHeroState = (open) => {
    heroOpen = open;
    heroShell.classList.toggle('hero-shell--dismissed', !open);
    document.documentElement.classList.toggle('hero-locked', open);
    document.documentElement.classList.toggle('hero-unlocked', !open);
    if (open) scrollEl.scrollTop = 0;
  };

  const finishTransition = () => {
    window.setTimeout(() => {
      isAnimating = false;
    }, transitionMs);
  };

  const dismissHero = () => {
    if (!heroOpen || isAnimating) return;

    isAnimating = true;
    applyHeroState(false);
    finishTransition();
  };

  const openHero = () => {
    if (heroOpen || isAnimating) return;
    if (scrollEl.scrollTop > 8) return;

    isAnimating = true;
    scrollEl.scrollTop = 0;
    applyHeroState(true);
    finishTransition();
  };

  const isFormField = (target) => (
    target instanceof Element && target.closest('textarea, input, select, button')
  );

  const onWheel = (event) => {
    if (isAnimating) return;

    if (heroOpen) {
      if (event.deltaY <= 0) return;
      event.preventDefault();
      dismissHero();
      return;
    }

    if (scrollEl.scrollTop > 8 || event.deltaY >= 0) return;
    event.preventDefault();
    openHero();
  };

  const onKeyDown = (event) => {
    if (!heroOpen || isAnimating) return;
    const nextKeys = ['ArrowDown', 'PageDown', ' '];
    if (!nextKeys.includes(event.key)) return;
    if (isFormField(event.target)) return;

    event.preventDefault();
    dismissHero();
  };

  const onHeroTouchStart = (event) => {
    if (!heroOpen) return;
    heroTouchStartY = event.touches[0]?.clientY ?? 0;
    heroTouchHandled = false;
  };

  const onHeroTouchMove = (event) => {
    if (!heroOpen || heroTouchHandled || isAnimating) return;

    const touch = event.touches[0];
    if (!touch) return;

    const deltaY = heroTouchStartY - touch.clientY;
    if (deltaY < HERO_SWIPE_MIN) return;

    event.preventDefault();
    heroTouchHandled = true;
    dismissHero();
  };

  const onHeroTouchEnd = (event) => {
    if (!heroOpen || heroTouchHandled || isAnimating) return;

    const touchEnd = event.changedTouches[0]?.clientY ?? heroTouchStartY;
    const delta = heroTouchStartY - touchEnd;
    if (delta < HERO_SWIPE_MIN) return;

    dismissHero();
  };

  const onRestoreTouchStart = (event) => {
    if (heroOpen) return;
    restoreTouchStartY = event.touches[0]?.clientY ?? 0;
    restoreTouchHandled = false;
  };

  const onRestoreTouchMove = (event) => {
    if (heroOpen || restoreTouchHandled || isAnimating) return;
    if (scrollEl.scrollTop > 8) return;

    const touch = event.touches[0];
    if (!touch) return;

    const deltaY = touch.clientY - restoreTouchStartY;
    if (deltaY < HERO_SWIPE_MIN) return;

    event.preventDefault();
    restoreTouchHandled = true;
    openHero();
  };

  const onRestoreTouchEnd = (event) => {
    if (heroOpen || restoreTouchHandled || isAnimating) return;
    if (scrollEl.scrollTop > 8) return;

    const touchEnd = event.changedTouches[0]?.clientY ?? restoreTouchStartY;
    const delta = touchEnd - restoreTouchStartY;
    if (delta < HERO_SWIPE_MIN) return;

    openHero();
  };

  applyHeroState(true);
  continueBtn?.addEventListener('click', dismissHero);

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('touchstart', onHeroTouchStart, { passive: true });
  window.addEventListener('touchmove', onHeroTouchMove, { passive: false });
  window.addEventListener('touchend', onHeroTouchEnd, { passive: true });

  scrollEl.addEventListener('touchstart', onRestoreTouchStart, { passive: true });
  scrollEl.addEventListener('touchmove', onRestoreTouchMove, { passive: false });
  scrollEl.addEventListener('touchend', onRestoreTouchEnd, { passive: true });
}

function initForm() {
  const form = document.getElementById('rsvp-form');
  const statusNode = document.getElementById('rsvp-status');

  if (!form || !statusNode) return;

  const setStatus = (message, type = 'info') => {
    if (!message) {
      statusNode.hidden = true;
      statusNode.textContent = '';
      statusNode.className = 'rsvp-status';
      return;
    }

    statusNode.hidden = false;
    statusNode.textContent = message;
    statusNode.className = `rsvp-status rsvp-status--${type}`;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const payload = { submitted_at: new Date().toISOString() };
    formData.forEach((value, key) => {
      payload[key] = value.toString().trim();
    });

    if (!FORM_ENDPOINT) {
      setStatus(
        'Форма готова. Подключите Google Таблицу: инструкция в папке google-apps-script, затем вставьте URL в FORM_ENDPOINT в script.js.',
        'warning'
      );
      console.info('RSVP payload preview:', payload);
      return;
    }

    const submitButton = form.querySelector("button[type='submit']");
    const defaultLabel = submitButton.dataset.defaultLabel || submitButton.textContent;

    try {
      submitButton.disabled = true;
      submitButton.textContent = 'Отправляем...';
      setStatus('Отправляем ответ...', 'info');

      await fetch(FORM_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      form.reset();
      setStatus('Спасибо! Ваш ответ сохранён.', 'success');
    } catch (error) {
      console.error(error);
      setStatus('Не получилось отправить анкету. Попробуйте ещё раз чуть позже.', 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = defaultLabel;
    }
  });
}

initHero();
initForm();
initDrinkTags();
initIntroEffects();

function initDrinkTags() {
  const form = document.getElementById('rsvp-form');
  if (!form) return;

  const drinkFields = [
    form.querySelector('[name="drinks_yes"]'),
    form.querySelector('[name="drinks_maybe"]'),
    form.querySelector('[name="drinks_no"]'),
  ].filter(Boolean);

  let activeField = drinkFields[0];

  drinkFields.forEach((field) => {
    field.addEventListener('focus', () => {
      activeField = field;
    });
  });

  form.querySelectorAll('.rsvp-tag').forEach((button) => {
    button.addEventListener('click', () => {
      const drink = button.dataset.drink;
      if (!drink || !activeField) return;

      const current = activeField.value.trim();
      activeField.value = current ? `${current}, ${drink}` : drink;
      activeField.focus();
    });
  });
}

function initIntroEffects() {
  const introPanel = document.getElementById('intro');
  const photo = introPanel.querySelector('.intro-photo-parallax');
  const scrollEl = document.getElementById('site-scroll');

  if (!introPanel) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const revealIntro = () => {
    introPanel.classList.add('is-visible');
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          revealIntro();
          observer.disconnect();
        }
      });
    }, {
      root: scrollEl || null,
      threshold: 0.15,
    });

    observer.observe(introPanel);
  } else {
    revealIntro();
  }

  requestAnimationFrame(() => {
    const rect = introPanel.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) revealIntro();
  });

  const heroShell = document.getElementById('hero-shell');
  if (heroShell) {
    const heroObserver = new MutationObserver(() => {
      if (heroShell.classList.contains('hero-shell--dismissed')) {
        window.setTimeout(revealIntro, 280);
      }
    });
    heroObserver.observe(heroShell, { attributes: true, attributeFilter: ['class'] });
  }

  if (reduceMotion || !photo || !scrollEl) return;

  let ticking = false;

  const updateParallax = () => {
    ticking = false;
    const rect = introPanel.getBoundingClientRect();
    const viewH = scrollEl.clientHeight;

    if (rect.bottom < 0 || rect.top > viewH) return;

    const progress = (viewH - rect.top) / (viewH + rect.height);
    const offset = (progress - 0.5) * 28;
    photo.style.transform = `translateY(${offset.toFixed(2)}px)`;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateParallax);
  };

  scrollEl.addEventListener('scroll', onScroll, { passive: true });
  updateParallax();
}
