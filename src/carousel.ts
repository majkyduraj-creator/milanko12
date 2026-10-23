import type { Testimonial } from '../site.config';
import { prefersReducedMotion } from './motion';

const arrow = (d: string) =>
  `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${d}" /></svg>`;

/** Prístupný karusel referencií: tlačidlá, klávesnica (←/→) a potiahnutie prstom. */
export function initCarousel(root: HTMLElement, items: Testimonial[]): void {
  if (!items.length) return;

  root.innerHTML = `
    <div class="carousel__viewport">
      <ul class="carousel__track" aria-live="polite"></ul>
    </div>
    <div class="carousel__controls">
      <button class="carousel__btn" type="button" data-prev aria-label="Predchádzajúca referencia">${arrow('M16 10H5m4-4-4 4 4 4')}</button>
      <button class="carousel__btn" type="button" data-next aria-label="Ďalšia referencia">${arrow('M4 10h11m-4-4 4 4-4 4')}</button>
      <span class="carousel__count" data-count></span>
    </div>`;

  const track = root.querySelector('.carousel__track') as HTMLElement;
  const count = root.querySelector('[data-count]') as HTMLElement;

  items.forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'carousel__slide';
    li.setAttribute('role', 'group');
    li.setAttribute('aria-roledescription', 'snímka');
    li.setAttribute('aria-label', `${i + 1} z ${items.length}`);

    const figure = document.createElement('figure');
    figure.className = 'quote';
    const mark = document.createElement('span');
    mark.className = 'quote__mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '“';
    const text = document.createElement('blockquote');
    text.className = 'quote__text';
    text.textContent = item.quote;
    const author = document.createElement('figcaption');
    author.className = 'quote__author';
    author.textContent = item.author;
    if (item.context) {
      const ctx = document.createElement('span');
      ctx.className = 'quote__context';
      ctx.textContent = ` · ${item.context}`;
      author.append(ctx);
    }
    figure.append(mark, text, author);
    li.append(figure);
    track.append(li);
  });

  const slides = [...track.children] as HTMLElement[];
  let index = 0;

  const go = (next: number) => {
    index = (next + items.length) % items.length;
    track.style.transform = `translateX(${-index * 100}%)`;
    slides.forEach((slide, i) => {
      slide.toggleAttribute('inert', i !== index);
      slide.setAttribute('aria-hidden', String(i !== index));
    });
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
  };

  if (prefersReducedMotion()) track.style.transition = 'none';

  const prev = root.querySelector('[data-prev]') as HTMLButtonElement;
  const next = root.querySelector('[data-next]') as HTMLButtonElement;
  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));

  if (items.length < 2) {
    prev.hidden = true;
    next.hidden = true;
  }

  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') go(index - 1);
    if (event.key === 'ArrowRight') go(index + 1);
  });

  let startX: number | null = null;
  const viewport = root.querySelector('.carousel__viewport') as HTMLElement;
  viewport.addEventListener('pointerdown', (e) => (startX = e.clientX));
  viewport.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 45) go(index + (dx < 0 ? 1 : -1));
  });
  viewport.addEventListener('pointercancel', () => (startX = null));

  go(0);
}
