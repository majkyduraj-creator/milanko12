/**
 * VEREJNÉ ÚDAJE WEBU
 * ------------------------------------------------------------------
 * Všetky polia označené „DOPLNIŤ“ musia byť vyplnené overenými údajmi.
 * Kým je pole prázdne, web namiesto neho zobrazí zreteľne označený
 * zástupný text a súvisiace tlačidlá (mailto, tel, trasa, mapa) skryje,
 * aby na stránke neboli nefunkčné odkazy.
 *
 * Hodnoty je možné prepísať aj premennými prostredia počas buildu
 * (pozri .env.example) – napr. BUSINESS_ADDRESS="Ulica 1, 811 01 Bratislava".
 */

export interface Testimonial {
  /** Doslovný text referencie so súhlasom klienta. */
  quote: string;
  /** Meno alebo iniciály v podobe, ktorú klient odsúhlasil. */
  author: string;
  /** Voliteľný doplnok, napr. „klient od roku …“ (len ak je overený). */
  context?: string;
}

export interface SiteConfig {
  name: string;
  designation: string;
  /** Verejný e-mail pre odkazy mailto: (DOPLNIŤ). */
  email: string;
  /** Telefón v tvare na zobrazenie, napr. „0900 000 000“ (DOPLNIŤ). */
  phone: string;
  /** Telefón v medzinárodnom tvare pre tel:, napr. „+421900000000“ (DOPLNIŤ). */
  phoneE164: string;
  /** Skutočná adresa kancelárie pre mapu a navigáciu (DOPLNIŤ). */
  BUSINESS_ADDRESS: string;
  /** Verejná URL webu bez lomky na konci – pre SEO a zdieľanie (DOPLNIŤ). */
  siteUrl: string;
  regulatory: {
    /** Napr. „podriadený finančný agent“ / „samostatný finančný agent“ (DOPLNIŤ). */
    status: string;
    /** Registračné číslo v registri NBS (DOPLNIŤ). */
    nbsNumber: string;
    /** Pri podriadenom finančnom agentovi: obchodné meno samostatného finančného agenta (DOPLNIŤ). */
    principal: string;
    /** Sektory, v ktorých je registrovaný, napr. „poistenie alebo zaistenie, prijímanie vkladov…“ (DOPLNIŤ). */
    sectors: string;
    /** IČO, ak je relevantné (DOPLNIŤ). */
    ico: string;
  };
  /**
   * Oblasti služieb – ponechajte len tie, ktoré skutočne poskytuje.
   * Kľúče musia zodpovedať kartám v index.html (data-solution).
   */
  solutions: Array<'hypoteky' | 'investicie' | 'poistenie' | 'dochodok' | 'planovanie'>;
  /** Iba skutočné referencie so súhlasom klientov. Prázdne pole = sekcia sa nezobrazí. */
  testimonials: Testimonial[];
}

const env = (key: string): string | undefined => {
  const value = typeof process !== 'undefined' ? process.env[key] : undefined;
  return value && value.trim() ? value.trim() : undefined;
};

/** Načíta konfiguráciu (volá sa až po načítaní premenných prostredia). */
export const getSite = (): SiteConfig => ({
  name: 'Frederik Urbančík',
  designation: 'Finančné sprostredkovanie',
  email: env('PUBLIC_EMAIL') ?? '', // DOPLNIŤ
  phone: env('PUBLIC_PHONE') ?? '', // DOPLNIŤ
  phoneE164: env('PUBLIC_PHONE_E164') ?? '', // DOPLNIŤ
  BUSINESS_ADDRESS: env('BUSINESS_ADDRESS') ?? '', // DOPLNIŤ
  siteUrl: env('SITE_URL') ?? '', // DOPLNIŤ
  regulatory: {
    status: env('REG_STATUS') ?? '', // DOPLNIŤ
    nbsNumber: env('REG_NBS_NUMBER') ?? '', // DOPLNIŤ
    principal: env('REG_PRINCIPAL') ?? '', // DOPLNIŤ
    sectors: env('REG_SECTORS') ?? '', // DOPLNIŤ
    ico: env('REG_ICO') ?? '', // DOPLNIŤ
  },
  solutions: ['hypoteky', 'investicie', 'poistenie', 'dochodok', 'planovanie'],
  testimonials: [],
});
