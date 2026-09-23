(() => {
  'use strict';
  const shell = document.getElementById('hero-film');
  const video = document.getElementById('hero-film-video');
  const toggle = document.getElementById('hero-video-toggle');
  if (!shell || !video || !toggle) return;
  const compact = window.matchMedia('(max-width: 750px)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const labels = ['Restaurants & grills', 'Construction companies', 'Plumbing companies', 'Clinics & medical practices', 'Lawyers & law firms', 'Products & retail'];
  const label = document.getElementById('hero-reel-industry');
  const marks = [...document.querySelectorAll('.hero-reel-progress i')];
  let userPaused = reduce.matches || Boolean(navigator.connection?.saveData);
  let visible = true;
  let loaded = false;
  let active = 0;

  video.muted = true;
  video.defaultMuted = true;

  function renderControl() {
    const playing = !video.paused && !video.ended;
    toggle.setAttribute('aria-label', playing ? 'Pause background video' : 'Play background video');
    toggle.innerHTML = playing ? '<span aria-hidden="true">Ⅱ</span><span>Pause reel</span>' : '<span aria-hidden="true">▷</span><span>Play reel</span>';
  }
  function selectSource() {
    const source = compact.matches ? video.dataset.mobile : video.dataset.desktop;
    if (video.getAttribute('src') === source) return;
    video.src = source;
    video.load();
    loaded = true;
  }
  function syncPlayback() {
    if (userPaused || !visible || document.hidden || document.body.classList.contains('motion-paused')) {
      video.pause();
      renderControl();
      return;
    }
    selectSource();
    const attempt = video.play();
    if (attempt) attempt.catch(() => renderControl());
  }
  toggle.addEventListener('click', () => {
    if (video.paused) {
      userPaused = false;
      if (document.body.classList.contains('motion-paused')) document.getElementById('motion-toggle')?.click();
    } else userPaused = true;
    syncPlayback();
  });
  video.addEventListener('playing', () => { shell.classList.add('has-video'); renderControl(); });
  video.addEventListener('pause', renderControl);
  video.addEventListener('error', () => { shell.classList.remove('has-video'); renderControl(); });
  video.addEventListener('timeupdate', () => {
    const next = Math.min(5, Math.floor(video.currentTime / 2));
    if (next === active) return;
    active = next;
    label.textContent = labels[active];
    marks.forEach((mark, index) => mark.classList.toggle('is-current', index === active));
  });
  document.addEventListener('site:motionchange', syncPlayback);
  document.addEventListener('visibilitychange', syncPlayback);
  reduce.addEventListener('change', () => { userPaused = reduce.matches; syncPlayback(); });
  compact.addEventListener('change', () => {
    if (loaded) { selectSource(); syncPlayback(); }
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncPlayback(); }, { threshold: 0.01 });
    observer.observe(shell);
  }
  syncPlayback();
})();
