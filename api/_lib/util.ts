import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      ...extra,
    },
  });

export const sha = (s: string) => createHash('sha256').update(s).digest('hex');
export const newId = () => `${Date.now().toString(36)}${randomBytes(5).toString('hex')}`;
export const newToken = () => randomBytes(24).toString('base64url');

export function safeEqual(a: string, b: string) {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb) && a.length === b.length;
}

// IP do visitante (Vercel preenche x-forwarded-for). Guardamos só o hash.
export function ipHash(req: Request) {
  const raw = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '0.0.0.0').split(',')[0].trim();
  return sha(`kx2:${raw}`).slice(0, 24);
}

// Só aceita POST vindo do próprio site (ou do dev local).
const ALLOWED = new Set([
  'https://www.korvexgateway.com',
  'https://korvexgateway.com',
]);
export function originOk(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  if (ALLOWED.has(origin)) return true;
  if (/^http:\/\/localhost:\d{2,5}$/.test(origin)) return true; // dev local
  // deploys de preview do próprio projeto
  return /^https:\/\/korvex-site-[a-z0-9-]+\.vercel\.app$/.test(origin);
}

// ---------- validação ----------

export const clean = (s: unknown, max: number) =>
  typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';

export function validName(s: string) {
  if (s.length < 2 || s.length > 80) return false;
  if (!/\p{L}{2,}/u.test(s)) return false; // pelo menos duas letras seguidas
  if (/https?:|www\.|@|<|>/i.test(s)) return false; // spam clássico
  return true;
}

export function validEmail(s: string) {
  return s.length <= 120 && /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(s) && !/\.\./.test(s);
}

const DDD = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92,
  93, 94, 95, 96, 97, 98, 99,
]);

// Devolve o WhatsApp em E.164 (+55DDNNNNNNNNN) ou null.
export function normalizePhone(input: string): string | null {
  let d = input.replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  if (!DDD.has(Number(d.slice(0, 2)))) return null;
  const local = d.slice(2);
  if (local.length === 9 && local[0] !== '9') return null; // celular tem 9 na frente
  if (local.length === 8 && !/^[2-9]/.test(local)) return null;
  if (/^(\d)\1+$/.test(local)) return null; // 99999-9999 e afins
  return `+55${d}`;
}

export const formatPhone = (e164: string) => {
  const d = e164.replace(/\D/g, '').slice(2);
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
};

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

// ---------- aviso por e-mail (Resend) ----------
// Liga sozinho quando RESEND_API_KEY e LEAD_NOTIFY_TO existem na Vercel.
export async function notify(subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_NOTIFY_TO;
  if (!key || !to) return false;
  const from = process.env.LEAD_NOTIFY_FROM || 'Korvex Lista 2.0 <onboarding@resend.dev>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: to.split(',').map((s) => s.trim()), subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
