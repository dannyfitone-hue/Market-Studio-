(() => {
  'use strict';

  const header = document.querySelector('.site-header');
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.getElementById('site-navigation');
  const compactNavigation = window.matchMedia('(max-width: 900px)');
  const compactGallery = window.matchMedia('(max-width: 750px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  function closeMenu({ restoreFocus = false } = {}) {
    header.classList.remove('menu-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.querySelector('span').textContent = 'Menu';
    if (restoreFocus) menuButton.focus();
  }

  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    header.classList.toggle('menu-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.querySelector('span').textContent = open ? 'Close' : 'Menu';
  });
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && header.classList.contains('menu-open')) {
      closeMenu({ restoreFocus: true });
    }
  });
  document.addEventListener('click', event => {
    if (!header.contains(event.target)) closeMenu();
  });
  header.addEventListener('focusout', event => {
    if (event.relatedTarget && !header.contains(event.relatedTarget)) closeMenu();
  });
  compactNavigation.addEventListener('change', () => closeMenu());
  header.classList.add('menu-ready');

  const gallery = document.getElementById('creative');
  const cards = Array.from(gallery.querySelectorAll('.creative-card'));
  const previous = document.getElementById('creative-prev');
  const next = document.getElementById('creative-next');
  const count = document.querySelector('.gallery-count');
  let current = 0;
  let frame = 0;

  function cardPosition(card) {
    return card.offsetLeft - parseFloat(getComputedStyle(gallery).paddingLeft || 0);
  }

  function updateGallery() {
    frame = 0;
    if (!compactGallery.matches) return;
    current = cards.reduce((nearest, card, index) => {
      const distance = Math.abs(cardPosition(card) - gallery.scrollLeft);
      const previousDistance = Math.abs(cardPosition(cards[nearest]) - gallery.scrollLeft);
      return distance < previousDistance ? index : nearest;
    }, 0);
    // The final card can stop before its starting position at the scroll boundary.
    const maximum = gallery.scrollWidth - gallery.clientWidth;
    if (maximum > 0 && gallery.scrollLeft >= maximum - 2) current = cards.length - 1;
    const label = `${current + 1} / ${cards.length}`;
    if (count.textContent !== label) count.textContent = label;
    previous.disabled = current === 0;
    next.disabled = current === cards.length - 1;
  }

  function moveGallery(direction) {
    const target = Math.max(0, Math.min(cards.length - 1, current + direction));
    gallery.scrollTo({ left: cardPosition(cards[target]), behavior: reduced.matches ? 'instant' : 'smooth' });
  }

  previous.addEventListener('click', () => moveGallery(-1));
  next.addEventListener('click', () => moveGallery(1));
  gallery.addEventListener('keydown', event => {
    if (!compactGallery.matches || event.target !== gallery) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      moveGallery(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  gallery.addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(updateGallery);
  }, { passive: true });
  compactGallery.addEventListener('change', () => {
    gallery.tabIndex = compactGallery.matches ? 0 : -1;
    updateGallery();
  });
  gallery.tabIndex = compactGallery.matches ? 0 : -1;
  document.querySelector('.hero').classList.add('gallery-ready');
  if ('ResizeObserver' in window) new ResizeObserver(updateGallery).observe(gallery);
  updateGallery();
})();
