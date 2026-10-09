// POST /api/v2-lead — captura da lista de acesso antecipado da Korvex 2.0.
// action=create  → grava nome, e-mail, WhatsApp e consentimento; devolve id + token
// action=answer  → grava respostas do quiz (exige o token do próprio lead)
// action=forget  → o próprio lead apaga o cadastro (LGPD; também limpa leads de teste)
import { kv, kvTx, kvReady, allow, K } from './_lib/kv.js';
import { QUIZ_BY_ID, CONSENT_TEXT, CONSENT_VERSION, labelOf, type QuizQuestion } from './_lib/v2-quiz.js';
import {
  json, sha, newId, newToken, safeEqual, ipHash, originOk, clean, validName, validEmail, normalizePhone,
  formatPhone, escapeHtml, notify,
} from './_lib/util.js';

export type Lead = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  email: string;
  phone: string;
  consent: { at: string; version: string; text: string };
  attr: Record<string, string>;
  page: string;
  answers: Partial<Record<QuizQuestion['id'], string | string[]>>;
  other: Partial<Record<'gateway' | 'dor', string>>;
  quizDone: boolean;
  quizDoneAt?: string;
  test: boolean;
  tokenHash: string;
  ip: string;
};

const ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'src'];
const MIN_FILL_MS = 2500; // humano não preenche 3 campos em menos de 2,5 s

const isTest = (name: string, email: string) =>
  /\[teste\]/i.test(name) || /@example\.(com|org)$/i.test(email) || /^teste\+/i.test(email);

async function load(id: string): Promise<Lead | null> {
  if (!/^[a-z0-9]{10,40}$/.test(id)) return null;
  const raw = await kv<string | null>('GET', K.lead(id));
  return raw ? (JSON.parse(raw) as Lead) : null;
}

async function save(lead: Lead) {
  await kvTx([
    ['SET', K.lead(lead.id), JSON.stringify(lead)],
    ['ZADD', K.index, Date.parse(lead.createdAt), lead.id],
    ['SET', K.email(sha(lead.email)), lead.id],
  ]);
}

const summaryHtml = (l: Lead) => {
  const rows: [string, string][] = [
    ['Nome', l.name],
    ['WhatsApp', `<a href="https://wa.me/${l.phone.replace(/\D/g, '')}">${formatPhone(l.phone)}</a>`],
    ['E-mail', l.email],
  ];
  (Object.keys(QUIZ_BY_ID) as QuizQuestion['id'][]).forEach((qid) => {
    const a = l.answers[qid];
    if (!a) return;
    const vals = (Array.isArray(a) ? a : [a]).map((v) => labelOf(qid, v));
    const other = qid === 'gateway' || qid === 'dor' ? l.other[qid] : '';
    rows.push([QUIZ_BY_ID[qid].title, escapeHtml(vals.join(', ') + (other ? ` (${other})` : ''))]);
  });
  const origem = Object.entries(l.attr).map(([k, v]) => `${k}=${v}`).join(' · ');
  if (origem) rows.push(['Origem', escapeHtml(origem)]);
  return `<table style="font:14px/1.5 system-ui,sans-serif;border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#5B6C80;vertical-align:top">${k}</td><td style="padding:4px 0;color:#152232">${k === 'WhatsApp' ? v : k === 'Nome' || k === 'E-mail' ? escapeHtml(v) : v}</td></tr>`)
    .join('')}</table><p style="font:13px system-ui;color:#5B6C80">Todos os leads: https://www.korvexgateway.com/v2/leads</p>`;
};

export async function POST(req: Request) {
  if (!originOk(req)) return json({ ok: false, error: 'origem' }, 403);
  if (!kvReady()) return json({ ok: false, error: 'Armazenamento indisponível. Tente de novo em instantes.' }, 503);

  const text = await req.text();
  if (text.length > 4000) return json({ ok: false, error: 'grande demais' }, 413);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ ok: false, error: 'json' }, 400);
  }

  const ip = ipHash(req);
  const action = body.action;

  try {
    // ---------------- criar ----------------
    if (action === 'create') {
      // Honeypot e tempo mínimo: finge sucesso para não ensinar o robô.
      if (clean(body.website, 200) || !(Number(body.t) >= MIN_FILL_MS)) {
        return json({ ok: true, id: newId(), token: newToken() });
      }
      if (!(await allow('create', ip, 6, 600))) {
        return json({ ok: false, error: 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.' }, 429);
      }

      const name = clean(body.name, 80);
      const email = clean(body.email, 120).toLowerCase();
      const phone = normalizePhone(clean(body.phone, 30));
      const errors: Record<string, string> = {};
      if (!validName(name)) errors.name = 'Escreva seu nome.';
      if (!validEmail(email)) errors.email = 'Confira o e-mail.';
      if (!phone) errors.phone = 'Use um celular com DDD, ex.: (11) 91234-5678.';
      if (body.consent !== true) errors.consent = 'Marque a autorização de contato para entrar na lista.';
      if (Object.keys(errors).length) return json({ ok: false, errors }, 422);

      const attrIn = (body.attr && typeof body.attr === 'object' ? body.attr : {}) as Record<string, unknown>;
      const attr: Record<string, string> = {};
      ATTR_KEYS.forEach((k) => {
        const v = clean(attrIn[k], 150);
        if (v) attr[k] = v;
      });

      const now = new Date().toISOString();
      const token = newToken();
      const existingId = await kv<string | null>('GET', K.email(sha(email)));
      const existing = existingId ? await load(existingId) : null;

      const lead: Lead = existing
        ? {
            ...existing,
            name,
            phone: phone!,
            updatedAt: now,
            consent: { at: now, version: CONSENT_VERSION, text: CONSENT_TEXT },
            attr: { ...existing.attr, ...attr },
            tokenHash: sha(token),
            test: existing.test || isTest(name, email),
          }
        : {
            id: newId(),
            createdAt: now,
            updatedAt: now,
            name,
            email,
            phone: phone!,
            consent: { at: now, version: CONSENT_VERSION, text: CONSENT_TEXT },
            attr,
            page: clean(body.page, 200) || '/v2',
            answers: {},
            other: {},
            quizDone: false,
            test: isTest(name, email),
            tokenHash: sha(token),
            ip,
          };

      await save(lead);
      if (!existing && !lead.test) {
        await notify(`Novo lead Korvex 2.0: ${lead.name}`, summaryHtml(lead));
      }
      return json({ ok: true, id: lead.id, token, returning: Boolean(existing), quizDone: lead.quizDone });
    }

    // ---------------- respostas do quiz ----------------
    if (action === 'answer' || action === 'forget') {
      if (!(await allow('answer', ip, 80, 600))) return json({ ok: false, error: 'Muitas tentativas.' }, 429);
      const lead = await load(clean(body.id, 40));
      const token = clean(body.token, 64);
      if (!lead || !token || !safeEqual(sha(token), lead.tokenHash)) return json({ ok: false, error: 'sessão' }, 403);

      if (action === 'forget') {
        await kvTx([
          ['DEL', K.lead(lead.id)],
          ['ZREM', K.index, lead.id],
          ['DEL', K.email(sha(lead.email))],
        ]);
        return json({ ok: true, deleted: true });
      }

      const answersIn = (body.answers && typeof body.answers === 'object' ? body.answers : {}) as Record<string, unknown>;
      for (const [qid, raw] of Object.entries(answersIn)) {
        const q = QUIZ_BY_ID[qid as QuizQuestion['id']];
        if (!q) continue;
        const allowed = new Set(q.options.map((o) => o.v));
        if (q.type === 'single') {
          if (typeof raw === 'string' && allowed.has(raw)) lead.answers[q.id] = raw;
        } else if (Array.isArray(raw)) {
          const vals = [...new Set(raw.filter((v): v is string => typeof v === 'string' && allowed.has(v)))];
          if (vals.length) lead.answers[q.id] = vals;
        }
      }
      const otherIn = (body.other && typeof body.other === 'object' ? body.other : {}) as Record<string, unknown>;
      (['gateway', 'dor'] as const).forEach((k) => {
        const v = clean(otherIn[k], 60);
        if (v) lead.other[k] = v;
        else if (k in otherIn) delete lead.other[k];
      });

      const now = new Date().toISOString();
      lead.updatedAt = now;
      const complete = (Object.keys(QUIZ_BY_ID) as QuizQuestion['id'][]).every((qid) => lead.answers[qid]);
      const justFinished = body.done === true && complete && !lead.quizDone;
      if (justFinished) {
        lead.quizDone = true;
        lead.quizDoneAt = now;
      }
      await kv('SET', K.lead(lead.id), JSON.stringify(lead));
      if (justFinished && !lead.test) {
        await notify(`Quiz respondido: ${lead.name}`, summaryHtml(lead));
      }
      return json({ ok: true, quizDone: lead.quizDone });
    }

    return json({ ok: false, error: 'ação' }, 400);
  } catch (err) {
    console.error('[v2-lead]', (err as Error).message);
    return json({ ok: false, error: 'Não conseguimos salvar agora. Tente de novo em instantes.' }, 500);
  }
}

export function GET() {
  return json({ ok: false, error: 'método' }, 405, { Allow: 'POST' });
}
