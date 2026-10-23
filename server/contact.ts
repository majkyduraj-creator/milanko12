/**
 * Serverová logika kontaktného formulára – nezávislá od hostingu.
 * Overí vstup, odfiltruje spam a doručí správu cez Resend API.
 */

export const INTERESTS = {
  hypoteky: 'Hypotéky a financovanie bývania',
  investicie: 'Investície a budovanie majetku',
  poistenie: 'Životné a neživotné poistenie',
  dochodok: 'Dôchodkové plánovanie',
  planovanie: 'Finančné plánovanie na mieru',
  ine: 'Iná téma',
} as const;

export type InterestKey = keyof typeof INTERESTS;

export interface ContactPayload {
  name: string;
  email: string;
  phone: string;
  interest: InterestKey;
  message: string;
  privacy: boolean;
}

export interface ContactEnv {
  RESEND_API_KEY?: string;
  CONTACT_EMAIL?: string;
  CONTACT_FROM_EMAIL?: string;
  ALLOWED_ORIGIN?: string;
}

export interface ContactRequest {
  body: unknown;
  ip: string;
  origin?: string | null;
  now?: number;
}

export interface ContactResult {
  status: number;
  body: { ok: true } | { ok: false; error: string; fields?: Partial<Record<keyof ContactPayload, string>> };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d\s/()-]{9,20}$/;
const MIN_FILL_MS = 3000;
const MAX_FORM_AGE_MS = 1000 * 60 * 60 * 24;
const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 5 };

const hits = new Map<string, number[]>();

/** Iba pre testy. */
export const resetRateLimit = (): void => hits.clear();

function rateLimited(ip: string, now: number): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT.max;
}

const str = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

export function validate(raw: Record<string, unknown>): {
  data: ContactPayload;
  errors: Partial<Record<keyof ContactPayload, string>>;
} {
  const data: ContactPayload = {
    name: str(raw.name, 120),
    email: str(raw.email, 160),
    phone: str(raw.phone, 30),
    interest: str(raw.interest, 20) as InterestKey,
    message: str(raw.message, 4000),
    privacy: raw.privacy === true || raw.privacy === 'on' || raw.privacy === 'true',
  };
  const errors: Partial<Record<keyof ContactPayload, string>> = {};

  if (data.name.length < 3) errors.name = 'Uveďte, prosím, meno a priezvisko.';
  if (!EMAIL_RE.test(data.email)) errors.email = 'Zadajte platnú e-mailovú adresu.';
  if (data.phone && (!PHONE_RE.test(data.phone) || data.phone.replace(/\D/g, '').length < 9)) {
    errors.phone = 'Zadajte platné telefónne číslo.';
  }
  if (!(data.interest in INTERESTS)) errors.interest = 'Vyberte oblasť záujmu.';
  if (data.message.length < 10) errors.message = 'Správa je príliš krátka.';
  if (!data.privacy) errors.privacy = 'Je potrebné potvrdiť oboznámenie sa so spracovaním osobných údajov.';

  return { data, errors };
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/** Odstráni zalomenia riadkov – ochrana hlavičiek e-mailu. */
const oneLine = (s: string): string => s.replace(/[\r\n]+/g, ' ');

export function buildEmail(data: ContactPayload) {
  const rows: [string, string][] = [
    ['Meno a priezvisko', data.name],
    ['E-mail', data.email],
    ['Telefón', data.phone || '—'],
    ['Oblasť záujmu', INTERESTS[data.interest]],
  ];
  const subject = oneLine(`Nová požiadavka o konzultáciu – ${INTERESTS[data.interest]} – ${data.name}`);
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nSpráva:\n${data.message}\n`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#0A0E27;line-height:1.55">
<h2 style="font-family:Georgia,serif;font-weight:400">Nová požiadavka o konzultáciu</h2>
<table cellpadding="6" style="border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="color:#6b6d78">${k}</td><td><strong>${escapeHtml(v)}</strong></td></tr>`)
    .join('')}</table>
<p style="margin-top:18px;color:#6b6d78">Správa:</p>
<p style="white-space:pre-wrap">${escapeHtml(data.message)}</p>
<p style="color:#6b6d78;font-size:12px">Odosielateľ potvrdil oboznámenie sa so spracovaním osobných údajov.</p></div>`;
  return { subject, text, html };
}

export async function handleContact(
  req: ContactRequest,
  env: ContactEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<ContactResult> {
  const now = req.now ?? Date.now();

  if (env.ALLOWED_ORIGIN && req.origin && req.origin !== env.ALLOWED_ORIGIN) {
    return { status: 403, body: { ok: false, error: 'Požiadavka nie je povolená.' } };
  }

  if (!req.body || typeof req.body !== 'object') {
    return { status: 400, body: { ok: false, error: 'Neplatná požiadavka.' } };
  }
  const raw = req.body as Record<string, unknown>;

  if (rateLimited(req.ip, now)) {
    return {
      status: 429,
      body: { ok: false, error: 'Odoslali ste príliš veľa požiadaviek. Skúste to, prosím, neskôr.' },
    };
  }

  // Honeypot – skryté pole vypĺňajú iba roboty. Tvárime sa, že prebehlo odoslanie.
  if (str(raw.website, 200)) {
    return { status: 200, body: { ok: true } };
  }

  // Formulár odoslaný príliš rýchlo (alebo bez časovej pečiatky) – typický bot.
  const startedAt = Number(raw.startedAt);
  if (!Number.isFinite(startedAt) || now - startedAt < MIN_FILL_MS || now - startedAt > MAX_FORM_AGE_MS) {
    return {
      status: 400,
      body: { ok: false, error: 'Formulár sa nepodarilo overiť. Obnovte, prosím, stránku a skúste to znova.' },
    };
  }

  const { data, errors } = validate(raw);
  if (Object.keys(errors).length) {
    return { status: 422, body: { ok: false, error: 'Skontrolujte, prosím, vyplnené údaje.', fields: errors } };
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_EMAIL || !env.CONTACT_FROM_EMAIL) {
    console.error('[contact] Chýba konfigurácia: RESEND_API_KEY, CONTACT_EMAIL alebo CONTACT_FROM_EMAIL.');
    return {
      status: 503,
      body: { ok: false, error: 'Odosielanie správ momentálne nie je k dispozícii.' },
    };
  }

  const email = buildEmail(data);
  try {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.CONTACT_FROM_EMAIL,
        to: [env.CONTACT_EMAIL],
        reply_to: data.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
    });
    if (!response.ok) {
      console.error('[contact] Resend vrátil chybu', response.status, await response.text().catch(() => ''));
      return { status: 502, body: { ok: false, error: 'Správu sa nepodarilo doručiť.' } };
    }
  } catch (error) {
    console.error('[contact] Chyba spojenia s Resend', error);
    return { status: 502, body: { ok: false, error: 'Správu sa nepodarilo doručiť.' } };
  }

  return { status: 200, body: { ok: true } };
}
