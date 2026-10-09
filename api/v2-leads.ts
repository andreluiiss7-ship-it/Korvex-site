// GET  /v2/leads              → tabela dos leads da lista Korvex 2.0 (senha)
// GET  /v2/leads?format=csv   → exporta CSV (abre no Excel/Sheets)
// POST /v2/leads (action=delete, id) → apaga um lead
// Proteção: HTTP Basic (qualquer usuário + LEADS_ADMIN_PASSWORD) e trava por IP após erros.
import { kv, kvPipe, kvTx, kvReady, allow, K } from './_lib/kv.js';
import { QUIZ, labelOf, type QuizQuestion } from './_lib/v2-quiz.js';
import { sha, safeEqual, ipHash, escapeHtml, formatPhone } from './_lib/util.js';
import type { Lead } from './v2-lead.js';

const NOINDEX = { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' };
const MAX_FAILS = 12;

async function auth(req: Request): Promise<Response | null> {
  const pass = process.env.LEADS_ADMIN_PASSWORD || '';
  if (pass.length < 12) {
    return new Response('Defina LEADS_ADMIN_PASSWORD (12+ caracteres) nas variáveis da Vercel e faça redeploy.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', ...NOINDEX },
    });
  }
  const ip = ipHash(req);
  const fails = Number((await kv<string | null>('GET', K.rate('authfail', ip))) || 0);
  if (fails >= MAX_FAILS) {
    return new Response('Muitas tentativas. Espere 15 minutos.', { status: 429, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...NOINDEX } });
  }
  const header = req.headers.get('authorization') || '';
  let given = '';
  if (header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6));
      given = decoded.slice(decoded.indexOf(':') + 1);
    } catch {}
  }
  if (given && safeEqual(given, pass)) return null;
  if (given) await allow('authfail', ip, MAX_FAILS, 900);
  return new Response('Acesso restrito.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Leads Korvex 2.0", charset="UTF-8"', 'Content-Type': 'text/plain; charset=utf-8', ...NOINDEX },
  });
}

async function allLeads(): Promise<Lead[]> {
  const ids = (await kv<string[]>('ZRANGE', K.index, 0, -1, 'REV')) || [];
  const out: Lead[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const raws = (await kvPipe([['MGET', ...chunk.map(K.lead)]]))[0] as (string | null)[] | null;
    (raws || []).forEach((r) => {
      if (r) out.push(JSON.parse(r));
    });
  }
  return out;
}

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const answer = (l: Lead, qid: QuizQuestion['id']) => {
  const a = l.answers?.[qid];
  if (!a) return '';
  const vals = (Array.isArray(a) ? a : [a]).map((v) => labelOf(qid, v));
  const other = qid === 'gateway' || qid === 'dor' ? l.other?.[qid] : '';
  return vals.join(', ') + (other ? ` (${other})` : '');
};
const answered = (l: Lead) => QUIZ.filter((q) => l.answers?.[q.id]).length;
const isDone = (l: Lead) => l.quizDone || answered(l) === QUIZ.length;
const origin = (l: Lead) => Object.entries(l.attr || {}).map(([k, v]) => `${k}=${v}`).join(' ');

function csv(leads: Lead[]) {
  const head = ['data', 'nome', 'email', 'whatsapp', ...QUIZ.map((q) => q.id), 'quiz_completo', 'teste', 'consentimento_em', 'origem', 'id'];
  // Aspas escapadas e proteção contra fórmula (=, +, -, @) ao abrir no Excel/Sheets.
  const cell = (v: string) => {
    let t = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
    return `"${t.replace(/"/g, '""')}"`;
  };
  const lines = leads.map((l) =>
    [fmtDate(l.createdAt), l.name, l.email, formatPhone(l.phone), ...QUIZ.map((q) => answer(l, q.id)), isDone(l) ? 'sim' : `parcial ${answered(l)}/5`, l.test ? 'sim' : '', l.consent?.at ? fmtDate(l.consent.at) : '', origin(l), l.id]
      .map(cell)
      .join(';'),
  );
  // BOM + ";" para o Excel em português abrir com acentos e colunas certas.
  return '﻿' + [head.map(cell).join(';'), ...lines].join('\r\n');
}

function page(leads: Lead[], showTests: boolean) {
  const visible = showTests ? leads : leads.filter((l) => !l.test);
  const real = leads.filter((l) => !l.test);
  const today = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const todayCount = real.filter((l) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(l.createdAt)) === today).length;
  const done = real.filter(isDone).length;
  const tests = leads.length - real.length;

  const wa = (l: Lead) => {
    const first = l.name.split(' ')[0];
    const msg = `Oi, ${first}! Aqui é da Korvex. Você entrou na lista de acesso antecipado da Korvex 2.0 e eu queria te mostrar a sua condição.`;
    return `https://wa.me/${l.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  };

  const rows = visible
    .map(
      (l) => `<tr${l.test ? ' class="t"' : ''}>
  <td class="n">${escapeHtml(fmtDate(l.createdAt))}</td>
  <td><strong>${escapeHtml(l.name)}</strong>${l.test ? ' <span class="tag">teste</span>' : ''}<br><span class="m">${escapeHtml(l.email)}</span></td>
  <td class="n"><a href="${wa(l)}" target="_blank" rel="noopener">${escapeHtml(formatPhone(l.phone))}</a></td>
  ${QUIZ.map((q) => `<td>${escapeHtml(answer(l, q.id)) || '<span class="m">·</span>'}</td>`).join('')}
  <td class="n">${isDone(l) ? 'completo' : `<span class="m">${answered(l)}/5</span>`}</td>
  <td class="m s">${escapeHtml(origin(l))}</td>
  <td><form method="post" onsubmit="return confirm('Apagar ${escapeHtml(l.name.replace(/[^\p{L}\p{N} .\[\]-]/gu, ''))}? Não dá para desfazer.')"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="${l.id}"><button>Apagar</button></form></td>
</tr>`,
    )
    .join('');

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Leads · Korvex 2.0</title>
<style>
@font-face{font-family:"Plus Jakarta Sans";font-weight:400;font-display:swap;src:url(/v2/fonts/plus-jakarta-sans-latin-400-normal.woff2) format("woff2")}
@font-face{font-family:"Plus Jakarta Sans";font-weight:700;font-display:swap;src:url(/v2/fonts/plus-jakarta-sans-latin-700-normal.woff2) format("woff2")}
:root{--ink:#101C29;--text:#152232;--muted:#5B6C80;--line:#E1E7EE;--bg:#F3F5F8;--accent:#3B5F86}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 "Plus Jakarta Sans",system-ui,sans-serif}
header{background:var(--ink);color:#E8EEF5;padding:16px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
header img{height:20px}header h1{font-size:15px;margin:0;font-weight:700}
.stats{display:flex;gap:28px;padding:18px 20px;border-bottom:1px solid var(--line);background:#fff;flex-wrap:wrap;align-items:baseline}
.stats div{font-variant-numeric:tabular-nums}.stats b{font-size:22px;display:block;font-weight:700;color:var(--ink)}.stats span{color:var(--muted);font-size:12px}
.actions{margin-left:auto;display:flex;gap:10px;align-items:center}
a{color:var(--accent)}.btn{display:inline-block;padding:8px 14px;border-radius:6px;background:var(--accent);color:#fff;text-decoration:none;font-weight:700}
.wrap{overflow-x:auto;padding:0 0 40px}
table{border-collapse:collapse;width:100%;min-width:1180px;background:#fff}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:700;position:sticky;top:0;background:#fff}
.n{font-variant-numeric:tabular-nums;white-space:nowrap}.m{color:var(--muted)}.s{font-size:12px;max-width:180px;word-break:break-word}
tr.t{background:#FBF6EC}.tag{font-size:11px;color:#8A5A10}
button{font:inherit;font-size:12px;border:1px solid var(--line);background:#fff;color:#A33;border-radius:6px;padding:4px 8px;cursor:pointer}
button:hover{border-color:#A33}
.empty{padding:48px 20px;color:var(--muted)}
::selection{background:#DCE6F0}
</style></head><body>
<header><img src="/v2/korvex-lockup-white.png" alt="Korvex"><h1>Lista de acesso antecipado · 2.0</h1></header>
<section class="stats">
  <div><b>${real.length}</b><span>leads</span></div>
  <div><b>${todayCount}</b><span>hoje</span></div>
  <div><b>${done}</b><span>quiz completo</span></div>
  <div class="actions">${tests ? `<a href="?${showTests ? '' : 'testes=1'}">${showTests ? 'Esconder' : 'Mostrar'} ${tests} de teste</a>` : ''}<a class="btn" href="?format=csv">Baixar CSV</a></div>
</section>
<div class="wrap">${
    visible.length
      ? `<table><thead><tr><th>Data</th><th>Lead</th><th>WhatsApp</th>${QUIZ.map((q) => `<th>${escapeHtml(q.title.replace(/\?$/, ''))}</th>`).join('')}<th>Quiz</th><th>Origem</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
      : '<p class="empty">Nenhum lead ainda. Assim que alguém entrar na lista em korvexgateway.com/v2, aparece aqui.</p>'
  }</div>
</body></html>`;
}

export async function GET(req: Request) {
  if (!kvReady()) return new Response('Armazenamento não conectado.', { status: 503, headers: NOINDEX });
  const denied = await auth(req);
  if (denied) return denied;
  const url = new URL(req.url);
  const leads = await allLeads();
  if (url.searchParams.get('format') === 'csv') {
    const stamp = new Date().toISOString().slice(0, 10);
    const list = url.searchParams.get('testes') ? leads : leads.filter((l) => !l.test);
    return new Response(csv(list), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="leads-korvex-2-${stamp}.csv"`, ...NOINDEX },
    });
  }
  if (url.searchParams.get('format') === 'json') {
    const list = leads.map(({ tokenHash, ip, ...rest }) => rest);
    return new Response(JSON.stringify({ total: list.length, leads: list }), { headers: { 'Content-Type': 'application/json; charset=utf-8', ...NOINDEX } });
  }
  return new Response(page(leads, Boolean(url.searchParams.get('testes'))), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'", ...NOINDEX },
  });
}

export async function POST(req: Request) {
  if (!kvReady()) return new Response('Armazenamento não conectado.', { status: 503, headers: NOINDEX });
  const denied = await auth(req);
  if (denied) return denied;
  // Proteção contra CSRF: o formulário só vale vindo desta mesma origem.
  const self = new URL(req.url);
  const from = req.headers.get('origin') || req.headers.get('referer') || '';
  try {
    if (new URL(from).host !== self.host) throw new Error();
  } catch {
    return new Response('Origem inválida.', { status: 403, headers: NOINDEX });
  }
  const form = await req.formData();
  const id = String(form.get('id') || '');
  if (form.get('action') === 'delete' && /^[a-z0-9]{10,40}$/.test(id)) {
    const raw = await kv<string | null>('GET', K.lead(id));
    const lead = raw ? (JSON.parse(raw) as Lead) : null;
    await kvTx([
      ['DEL', K.lead(id)],
      ['ZREM', K.index, id],
      ...(lead ? [['DEL', K.email(sha(lead.email))]] : []),
    ]);
  }
  const back = new URL(req.headers.get('referer') || '/v2/leads', self);
  back.searchParams.delete('format');
  return new Response(null, { status: 303, headers: { Location: back.pathname + back.search, ...NOINDEX } });
}
