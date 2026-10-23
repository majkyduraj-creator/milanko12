import type { Testimonial } from '../site.config';

declare global {
  /** Verejný výber údajov zo site.config.ts vložený pri builde. */
  const __SITE__: { email: string; testimonials: Testimonial[] };
}

export {};
