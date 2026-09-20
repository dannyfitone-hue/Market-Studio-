'use strict';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionButtons = Array.from(document.querySelectorAll('.motion-toggle'));
let paused = false;

motionButtons.forEach(button => button.addEventListener('click', () => {
  paused = !paused;
  document.body.classList.toggle('motion-paused', paused);
  motionButtons.forEach(control => {
    control.setAttribute('aria-pressed', String(paused));
    control.innerHTML = paused
      ? '<span aria-hidden="true">▷</span> Resume motion'
      : '<span aria-hidden="true">Ⅱ</span> Pause motion';
  });
  document.dispatchEvent(new CustomEvent('site:motionchange', { detail: { paused } }));
}));

if (!reducedMotion.matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('pending');
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.results-grid, .approach-grid, .industries, .package-card, .founder, .closing').forEach(element => {
    if (element.getBoundingClientRect().top > window.innerHeight) {
      element.classList.add('reveal', 'pending');
      observer.observe(element);
    }
  });
}

document.getElementById('year').textContent = new Date().getFullYear();
