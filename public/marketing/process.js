/* A progressively enhanced, keyboard-accessible eight-step production tour. */
(() => {
  'use strict';

  const section = document.querySelector('.journey');
  if (!section) return;
  const tabs = Array.from(section.querySelectorAll('.journey-tab'));
  const panels = Array.from(section.querySelectorAll('.journey-panel'));
  const tourButton = document.getElementById('journey-tour');
  const previousButton = document.getElementById('journey-prev');
  const nextButton = document.getElementById('journey-next');
  const stage = section.querySelector('.journey-console');
  const progress = section.querySelector('.journey-progress > span');
  const currentLabel = document.getElementById('journey-current');
  const statusLabel = document.getElementById('journey-status-label');
  const stepPicker = document.getElementById('journey-step-select');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');
  const tourDuration = 7000;
  let activeStep = 0;
  let tourPlaying = false;
  let timer = null;

  function setTourButton() {
    tourButton.setAttribute('aria-pressed', String(tourPlaying));
    tourButton.querySelector('span').textContent = tourPlaying
      ? 'Pause the tour'
      : activeStep === panels.length - 1 ? 'Replay the journey' : 'Play all 8 steps';
    tourButton.querySelector('svg').innerHTML = tourPlaying
      ? '<path d="M6 4h3v12H6zm5 0h3v12h-3z" fill="currentColor"/>'
      : '<path d="m7 4 9 6-9 6Z" fill="currentColor"/>';
  }

  function stopTour() {
    clearTimeout(timer);
    timer = null;
    tourPlaying = false;
    stage.classList.remove('tour-playing');
    setTourButton();
  }

  function selectStep(index, { focus = false, manual = true } = {}) {
    if (manual) stopTour();
    activeStep = Math.max(0, Math.min(panels.length - 1, index));
    tabs.forEach((tab, position) => {
      const selected = position === activeStep;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[position].hidden = !selected;
      panels[position].classList.toggle('is-active', selected);
      panels[position].classList.remove('is-entering');
    });
    if (!motionPreference.matches) {
      void panels[activeStep].offsetWidth;
      panels[activeStep].classList.add('is-entering');
    }
    stage.dataset.step = String(activeStep);
    progress.style.width = `${((activeStep + 1) / panels.length) * 100}%`;
    currentLabel.textContent = String(activeStep + 1).padStart(2, '0');
    statusLabel.textContent = tabs[activeStep].querySelector('.tab-label').textContent;
    stepPicker.value = String(activeStep);
    fitScene(panels[activeStep].querySelector('.journey-visual'));
    previousButton.disabled = activeStep === 0;
    nextButton.disabled = activeStep === panels.length - 1;
    setTourButton();
    if (focus) tabs[activeStep].focus({ preventScroll: true });
  }

  function scheduleNext() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!tourPlaying) return;
      if (activeStep === panels.length - 1) {
        stopTour();
        return;
      }
      selectStep(activeStep + 1, { manual: false });
      scheduleNext();
    }, tourDuration);
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectStep(index));
    tab.addEventListener('keydown', event => {
      let target = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') target = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') target = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = tabs.length - 1;
      else return;
      event.preventDefault();
      selectStep(target, { focus: true });
    });
  });

  stepPicker.addEventListener('change', () => selectStep(Number(stepPicker.value)));

  previousButton.addEventListener('click', () => selectStep(activeStep - 1));
  nextButton.addEventListener('click', () => selectStep(activeStep + 1));
  tourButton.addEventListener('click', () => {
    if (tourPlaying) { stopTour(); return; }
    selectStep(0, { manual: false });
    tourPlaying = true;
    stage.classList.add('tour-playing');
    setTourButton();
    scheduleNext();
  });

  section.addEventListener('keydown', event => {
    if (event.key === 'Escape') stopTour();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopTour(); });
  document.addEventListener('site:motionchange', event => { if (event.detail.paused) stopTour(); });
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) stopTour();
    section.querySelectorAll('.journey-visual').forEach(visual => {
      visual.style.setProperty('--tilt-x', '0deg');
      visual.style.setProperty('--tilt-y', '0deg');
    });
  });

  if ('IntersectionObserver' in window) {
    const visibilityObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        section.classList.toggle('is-offscreen', !entry.isIntersecting);
        if (!entry.isIntersecting) stopTour();
      });
    }, { threshold: 0.08 });
    visibilityObserver.observe(section);
  }

  const colorSlider = document.getElementById('grade-range');
  const colorScene = section.querySelector('.scene-color');
  colorSlider.addEventListener('input', () => {
    stopTour();
    const finished = Number(colorSlider.value);
    colorScene.style.setProperty('--grade', `${100 - finished}%`);
    colorSlider.setAttribute('aria-valuetext', `${finished} percent finished, ${100 - finished} percent before`);
  });

  function fitScene(visual) {
    if (!visual || !visual.clientWidth) return;
    const scale = Math.min(1, Math.max(.35, (visual.clientWidth - 16) / 460));
    visual.style.setProperty('--scene-scale', scale.toFixed(3));
    visual.style.setProperty('--scene-height', `${Math.ceil(315 * scale + 66)}px`);
  }

  if ('ResizeObserver' in window) {
    const sceneObserver = new ResizeObserver(entries => {
      entries.forEach(entry => fitScene(entry.target));
    });
    section.querySelectorAll('.journey-visual').forEach(visual => sceneObserver.observe(visual));
  } else {
    window.addEventListener('resize', () => fitScene(panels[activeStep].querySelector('.journey-visual')));
  }
  fitScene(panels[0].querySelector('.journey-visual'));

  section.querySelectorAll('.journey-visual').forEach(visual => {
    visual.addEventListener('pointermove', event => {
      if (motionPreference.matches || !finePointer.matches || document.body.classList.contains('motion-paused')) return;
      const bounds = visual.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      visual.style.setProperty('--tilt-x', `${-y * 5}deg`);
      visual.style.setProperty('--tilt-y', `${x * 7}deg`);
    });
    visual.addEventListener('pointerleave', () => {
      visual.style.setProperty('--tilt-x', '0deg');
      visual.style.setProperty('--tilt-y', '0deg');
    });
  });
})();
