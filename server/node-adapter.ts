import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleContact, type ContactEnv } from './contact';

const MAX_BODY = 32 * 1024;

async function readJson(req: IncomingMessage & { body?: unknown }): Promise<unknown> {
  // Niektoré platformy (napr. Vercel) telo už rozparsovali.
  if (req.body !== undefined) {
    if (typeof req.body === 'string') return JSON.parse(req.body);
    return req.body;
  }
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw new Error('Body too large');
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null');
}

const send = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

/** Node (req, res) handler – používa ho Vercel funkcia aj Vite dev/preview server. */
export async function contactNodeHandler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
  env: ContactEnv = process.env,
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    send(res, 405, { ok: false, error: 'Metóda nie je povolená.' });
    return;
  }
  if (!String(req.headers['content-type'] ?? '').includes('application/json')) {
    send(res, 415, { ok: false, error: 'Neplatný formát požiadavky.' });
    return;
  }

  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    send(res, 400, { ok: false, error: 'Neplatná požiadavka.' });
    return;
  }

  const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
  const result = await handleContact(
    { body, ip: forwarded || req.socket.remoteAddress || 'unknown', origin: req.headers.origin ?? null },
    env,
  );
  send(res, result.status, result.body);
}
