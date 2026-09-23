(() => {
  'use strict';
  const choices = [...document.querySelectorAll('[data-service]')];
  const caption = document.querySelector('.service-frequency-caption');
  choices.forEach(button => button.addEventListener('click', () => {
    const service = button.dataset.service;
    const monthly = service === 'monthly';
    choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
    caption.textContent = monthly
      ? 'Fresh creative. Managed campaigns. Ongoing care for your next offer.'
      : 'One promo. One campaign. A complete launch.';
    document.querySelectorAll('.rate-frequency').forEach(label => {
      label.textContent = monthly ? 'Monthly membership' : 'One-time campaign';
    });
    document.querySelectorAll('.frequency-detail').forEach(detail => {
      detail.textContent = detail.dataset[service];
    });
    document.querySelectorAll('[data-package]').forEach(link => {
      const url = new URL(link.href);
      url.searchParams.set('service', service);
      link.href = url.href;
    });
  }));

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 901px)');
  const cards = [...document.querySelectorAll('.growth-package')];
  function reset(card) {
    card.style.removeProperty('--card-x');
    card.style.removeProperty('--card-y');
  }
  cards.forEach(card => {
    card.addEventListener('pointermove', event => {
      if (reduced.matches || !pointer.matches || document.body.classList.contains('motion-paused')) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--card-x', `${-((event.clientY - rect.top) / rect.height - .5) * 3}deg`);
      card.style.setProperty('--card-y', `${((event.clientX - rect.left) / rect.width - .5) * 4}deg`);
    });
    card.addEventListener('pointerleave', () => reset(card));
  });
  reduced.addEventListener('change', () => cards.forEach(reset));
  pointer.addEventListener('change', () => cards.forEach(reset));
  document.addEventListener('site:motionchange', event => { if (event.detail.paused) cards.forEach(reset); });
})();
