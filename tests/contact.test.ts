import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildEmail, handleContact, resetRateLimit } from '../server/contact';
import { renderTemplate } from '../build/template';
import { getSite } from '../site.config';

const NOW = 1_700_000_000_000;
const env = { RESEND_API_KEY: 're_test', CONTACT_EMAIL: 'to@example.com', CONTACT_FROM_EMAIL: 'Web <web@example.com>' };
const valid = {
  name: 'Jana Nováková',
  email: 'jana@example.sk',
  phone: '+421 900 123 456',
  interest: 'hypoteky',
  message: 'Rada by som prebrala možnosti financovania bytu.',
  privacy: true,
  website: '',
  startedAt: NOW - 10_000,
};
const req = (body: unknown, ip = '1.1.1.1') => ({ body, ip, now: NOW });
const okFetch = () => vi.fn(async () => new Response('{"id":"x"}', { status: 200 })) as unknown as typeof fetch;

beforeEach(() => resetRateLimit());

describe('handleContact', () => {
  it('doručí platnú správu cez Resend s reply_to návštevníka', async () => {
    const fetchMock = okFetch();
    const res = await handleContact(req(valid), env, fetchMock);
    expect(res).toEqual({ status: 200, body: { ok: true } });
    const [url, init] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    const sent = JSON.parse(init.body);
    expect(sent.to).toEqual(['to@example.com']);
    expect(sent.reply_to).toBe('jana@example.sk');
    expect(init.headers.Authorization).toBe('Bearer re_test');
  });

  it('vráti chyby polí pri neplatnom vstupe a nič neodošle', async () => {
    const fetchMock = okFetch();
    const res = await handleContact(req({ ...valid, email: 'zle', privacy: false, interest: 'xyz' }), env, fetchMock);
    expect(res.status).toBe(422);
    expect(res.body.ok).toBe(false);
    if (!res.body.ok) expect(Object.keys(res.body.fields ?? {})).toEqual(['email', 'interest', 'privacy']);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ticho zahodí správu s vyplneným honeypotom', async () => {
    const fetchMock = okFetch();
    const res = await handleContact(req({ ...valid, website: 'http://spam' }), env, fetchMock);
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('odmietne príliš rýchle odoslanie', async () => {
    const res = await handleContact(req({ ...valid, startedAt: NOW - 500 }), env, okFetch());
    expect(res.status).toBe(400);
  });

  it('nehlási úspech, keď chýba konfigurácia', async () => {
    const res = await handleContact(req(valid), {}, okFetch());
    expect(res.status).toBe(503);
    expect(res.body.ok).toBe(false);
  });

  it('nehlási úspech, keď Resend vráti chybu', async () => {
    const failing = vi.fn(async () => new Response('bad', { status: 422 })) as unknown as typeof fetch;
    const res = await handleContact(req(valid), env, failing);
    expect(res.status).toBe(502);
  });

  it('obmedzí počet požiadaviek z jednej IP', async () => {
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await handleContact(req(valid), env, okFetch())).status);
    expect(statuses.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(statuses[5]).toBe(429);
  });

  it('odmietne cudzí pôvod, ak je nastavený ALLOWED_ORIGIN', async () => {
    const res = await handleContact(
      { ...req(valid), origin: 'https://evil.example' },
      { ...env, ALLOWED_ORIGIN: 'https://www.example.sk' },
      okFetch(),
    );
    expect(res.status).toBe(403);
  });
});

describe('buildEmail', () => {
  it('escapuje HTML a odstráni zalomenia z predmetu', () => {
    const mail = buildEmail({ ...valid, name: 'X\r\nBcc: a@b.c', message: '<script>alert(1)</script>' } as never);
    expect(mail.subject).not.toMatch(/[\r\n]/);
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
  });
});

describe('renderTemplate', () => {
  const html = '<!--@if email--><a href="{{mailtoHref}}">{{email}}</a><!--@else--><span class="ph">x</span><!--@endif-->';

  it('zobrazí zástupný text, ak údaj chýba', () => {
    expect(renderTemplate(html, { ...getSite(), email: '' })).toBe('<span class="ph">x</span>');
  });

  it('vloží a escapuje údaj, ak je vyplnený', () => {
    expect(renderTemplate(html, { ...getSite(), email: 'a&b@example.sk' })).toBe(
      '<a href="mailto:a&amp;b@example.sk">a&amp;b@example.sk</a>',
    );
  });

  it('podporuje vnorené podmienky', () => {
    const tpl = '<!--@if reg-->A<!--@if reg.ico-->B<!--@endif-->C<!--@else-->X<!--@endif-->';
    const base = getSite();
    expect(renderTemplate(tpl, base)).toBe('X');
    const reg = { ...base.regulatory, status: 's', nbsNumber: '1' };
    expect(renderTemplate(tpl, { ...base, regulatory: reg })).toBe('AC');
    expect(renderTemplate(tpl, { ...base, regulatory: { ...reg, ico: '9' } })).toBe('ABC');
  });

  it('vytvorí odkazy na mapu a trasu z adresy', () => {
    const out = renderTemplate('{{mapEmbedUrl}}|{{directionsUrl}}', { ...getSite(), BUSINESS_ADDRESS: 'Hlavná 1, Košice' });
    expect(out).toContain('maps?q=Hlavn%C3%A1%201%2C%20Ko%C5%A1ice&amp;output=embed');
    expect(out).toContain('maps/dir/?api=1&amp;destination=Hlavn%C3%A1%201%2C%20Ko%C5%A1ice');
  });
});
