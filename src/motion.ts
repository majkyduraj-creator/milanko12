export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Plynulé zobrazenie fotografií; ak sa nenačítajú, zostane decentné pozadie. */
export function initMedia(): void {
  document.querySelectorAll<HTMLElement>('[data-media]').forEach((figure) => {
    const img = figure.querySelector('img');
    if (!img) return;
    const loaded = () => figure.classList.add('is-loaded');
    const missing = () => figure.classList.add('is-missing');
    if (img.complete) {
      if (img.naturalWidth > 0) loaded();
      else missing();
    } else {
      img.addEventListener('load', loaded, { once: true });
      img.addEventListener('error', missing, { once: true });
    }
  });
}

export function initHero(): void {
  const hero = document.querySelector<HTMLElement>('.hero');
  if (!hero) return;
  requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-ready')));
}

export function initReveal(): void {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
  );
  targets.forEach((el) => observer.observe(el));
}

/** Jemný paralaxný posun hero fotografie – iba počas viditeľnosti hero sekcie. */
export function initParallax(): void {
  const layer = document.querySelector<HTMLElement>('[data-parallax]');
  if (!layer || prefersReducedMotion()) return;

  let ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY;
    if (y > window.innerHeight * 1.2) return;
    layer.style.transform = `translate3d(0, ${(y * 0.18).toFixed(1)}px, 0)`;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
}
