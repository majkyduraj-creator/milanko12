/** Overené kontaktné údaje znalca – jediný zdroj pravdy pre skripty. */
export const CONTACT = {
  email: 'peter.villant@gmail.com',
  phoneDisplay: '0915 782 387',
  phoneHref: 'tel:+421915782387',
} as const;

/**
 * Voliteľná URL služby, ktorá prijme JSON z formulára (napr. Formspree).
 * Ak nie je nastavená, formulár pripraví e-mail v programe návštevníka.
 */
export const FORM_ENDPOINT: string = (import.meta.env.VITE_FORM_ENDPOINT ?? '').trim();
