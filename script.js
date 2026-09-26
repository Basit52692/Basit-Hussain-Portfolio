const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('#primary-nav');
const header = document.querySelector('.site-header');
const progressBar = document.querySelector('.page-progress span');

function closeMenu() {
  if (!menu || !menuButton) return;
  menu.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open menu');
}

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menu?.classList.toggle('open', open);
});

menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMenu();
});

document.addEventListener('click', event => {
  if (!menu?.classList.contains('open')) return;
  if (menu.contains(event.target) || menuButton?.contains(event.target)) return;
  closeMenu();
});

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

function updateScrollUI() {
  const top = window.scrollY || document.documentElement.scrollTop;
  header?.classList.toggle('scrolled', top > 12);

  if (progressBar) {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(100, (top / scrollable) * 100) : 0;
    progressBar.style.width = `${progress}%`;
  }
}

updateScrollUI();
window.addEventListener('scroll', updateScrollUI, { passive: true });

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if ('IntersectionObserver' in window && !reduceMotion) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px 45px 0px' });

  document.querySelectorAll('.reveal').forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index % 4, 3) * 45}ms`;
    revealObserver.observe(element);
  });
} else {
  document.querySelectorAll('.reveal').forEach(element => element.classList.add('visible'));
}

const navLinks = [...document.querySelectorAll('.nav a[href^="#"]')].filter(link => link.getAttribute('href') !== '#contact');
const sectionMap = navLinks
  .map(link => ({ link, section: document.querySelector(link.getAttribute('href')) }))
  .filter(item => item.section);

if ('IntersectionObserver' in window && sectionMap.length) {
  const navObserver = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;
    navLinks.forEach(link => link.classList.remove('active'));
    const match = sectionMap.find(item => item.section === visible.target);
    match?.link.classList.add('active');
  }, { rootMargin: '-20% 0px -68% 0px', threshold: [0, 0.1, 0.25] });

  sectionMap.forEach(item => navObserver.observe(item.section));
}

// Power BI project gallery
const powerBiPreview = document.querySelector('#powerbi-preview');
const powerBiThumbs = document.querySelectorAll('.powerbi-thumb');
powerBiThumbs.forEach((thumb) => {
  thumb.addEventListener('click', () => {
    if (!powerBiPreview) return;
    powerBiPreview.src = thumb.dataset.src;
    powerBiPreview.alt = thumb.dataset.alt || 'Power BI dashboard preview';
    powerBiThumbs.forEach((item) => {
      item.classList.remove('active');
      item.setAttribute('aria-pressed', 'false');
    });
    thumb.classList.add('active');
    thumb.setAttribute('aria-pressed', 'true');
  });
});
