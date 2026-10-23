import type { SiteConfig } from '../site.config';

/**
 * Jednoduché šablónovanie HTML počas buildu:
 *   {{key}}                                   – vloží (escapovanú) hodnotu
 *   <!--@if key-->…<!--@else-->…<!--@endif-->  – podmienený blok (podporuje vnáranie)
 */

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

export function templateValues(site: SiteConfig): Record<string, string> {
  const addr = encodeURIComponent(site.BUSINESS_ADDRESS);
  const r = site.regulatory;
  return {
    name: site.name,
    designation: site.designation,
    email: site.email,
    mailtoHref: site.email ? `mailto:${site.email}` : '',
    consultMailtoHref: site.email
      ? `mailto:${site.email}?subject=${encodeURIComponent('Žiadosť o súkromnú konzultáciu')}`
      : '',
    phone: site.phone,
    telHref: site.phoneE164 ? `tel:${site.phoneE164.replace(/[^\d+]/g, '')}` : '',
    address: site.BUSINESS_ADDRESS,
    mapEmbedUrl: site.BUSINESS_ADDRESS ? `https://www.google.com/maps?q=${addr}&output=embed&hl=sk` : '',
    directionsUrl: site.BUSINESS_ADDRESS ? `https://www.google.com/maps/dir/?api=1&destination=${addr}` : '',
    siteUrl: site.siteUrl,
    ogImage: site.siteUrl ? `${site.siteUrl}/og-image.png` : '/og-image.png',
    year: String(new Date().getFullYear()),
    'reg.status': r.status,
    'reg.nbsNumber': r.nbsNumber,
    'reg.principal': r.principal,
    'reg.sectors': r.sectors,
    'reg.ico': r.ico,
  };
}

function conditions(site: SiteConfig, values: Record<string, string>): Record<string, boolean> {
  const flags: Record<string, boolean> = {
    phone: Boolean(site.phone && site.phoneE164),
    testimonials: site.testimonials.length > 0,
    reg: Boolean(site.regulatory.status && site.regulatory.nbsNumber),
  };
  for (const [k, v] of Object.entries(values)) if (!(k in flags)) flags[k] = Boolean(v);
  for (const s of site.solutions) flags[`solution:${s}`] = true;
  return flags;
}

export function renderTemplate(html: string, site: SiteConfig): string {
  const values = templateValues(site);
  const flags = conditions(site, values);

  // Najvnútornejšie bloky sa vyhodnotia ako prvé, takže vnáranie funguje.
  const block =
    /<!--@if (!?)([\w.:]+)-->((?:(?!<!--@if )[\s\S])*?)(?:<!--@else-->((?:(?!<!--@if )[\s\S])*?))?<!--@endif-->/g;
  let withBlocks = html;
  for (let prev = ''; prev !== withBlocks; ) {
    prev = withBlocks;
    withBlocks = withBlocks.replace(block, (_m, neg: string, key: string, yes: string, no = '') =>
      (flags[key] ?? false) !== Boolean(neg) ? yes : no,
    );
  }

  return withBlocks.replace(/\{\{([\w.]+)\}\}/g, (m, key: string) =>
    key in values ? escapeHtml(values[key]) : m,
  );
}

export function missingFields(site: SiteConfig): string[] {
  const missing: string[] = [];
  if (!site.email) missing.push('email');
  if (!site.phone || !site.phoneE164) missing.push('phone / phoneE164');
  if (!site.BUSINESS_ADDRESS) missing.push('BUSINESS_ADDRESS');
  if (!site.siteUrl) missing.push('siteUrl');
  for (const [k, v] of Object.entries(site.regulatory)) if (!v) missing.push(`regulatory.${k}`);
  return missing;
}
