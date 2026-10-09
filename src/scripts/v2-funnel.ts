// Funil da lista Korvex 2.0: contato → quiz (uma pergunta por tela) → obrigado.
// O lead é gravado no primeiro passo; cada resposta do quiz é salva ao ser dada.
import type { QuizQuestion } from '../../api/_lib/v2-quiz';

// As perguntas vêm do HTML (injetadas pela página a partir de api/_lib/v2-quiz.ts).
const QUIZ = JSON.parse(document.getElementById('quiz-data')?.textContent || '[]') as QuizQuestion[];

type Answers = Partial<Record<QuizQuestion['id'], string | string[]>>;
type State = {
  id?: string;
  token?: string;
  name?: string;
  email?: string;
  phone?: string;
  step: number;
  answers: Answers;
  other: Partial<Record<'gateway' | 'dor', string>>;
  done: boolean;
};

const API = '/api/v2-lead';
const STORE = 'kx2_lista';
const ATTR_STORE = 'kx_attr';
const ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'src'];
const WA = '5512997391545';
const mq = window.matchMedia('(max-width: 1023.98px)');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll(sel)) as T[];

const funnel = $('#lista');
const form = $<HTMLFormElement>('#lead-form');
const quizView = $('.view--quiz', funnel);
const sticky = $('[data-sticky]');
const renderedAt = performance.now();

// ---------- estado ----------
const load = (): State => {
  try {
    const s = JSON.parse(sessionStorage.getItem(STORE) || 'null');
    if (s && typeof s === 'object') return { step: 0, answers: {}, other: {}, done: false, ...s };
  } catch {}
  return { step: 0, answers: {}, other: {}, done: false };
};
let state = load();
const persist = () => {
  try { sessionStorage.setItem(STORE, JSON.stringify(state)); } catch {}
};

const attribution = (): Record<string, string> => {
  const out: Record<string, string> = {};
  try { Object.assign(out, JSON.parse(sessionStorage.getItem(ATTR_STORE) || '{}')); } catch {}
  const q = new URLSearchParams(location.search);
  ATTR_KEYS.forEach((k) => { const v = q.get(k); if (v) out[k] = v; });
  try { if (Object.keys(out).length) sessionStorage.setItem(ATTR_STORE, JSON.stringify(out)); } catch {}
  return out;
};
const attr = attribution();

type Fbq = (...args: unknown[]) => void;
const track = (ev: string, data?: Record<string, unknown>, custom = false, eventID?: string) => {
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (!fbq) return;
  if (eventID) fbq(custom ? 'trackCustom' : 'track', ev, data || {}, { eventID });
  else fbq(custom ? 'trackCustom' : 'track', ev, data || {});
};

// ---------- utilidades ----------
const first = (name = '') => name.replace(/\[[^\]]*\]/g, ' ').trim().split(/\s+/)[0] || '';
const digits = (s: string) => s.replace(/\D/g, '');
const maskPhone = (v: string) => {
  let d = digits(v);
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
const DDD = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));

const checkName = (v: string) => {
  const s = v.trim().replace(/\s+/g, ' ');
  if (!s) return 'Escreva seu nome.';
  if (s.length < 2 || !/\p{L}{2,}/u.test(s)) return 'Escreva seu nome, sem só iniciais.';
  if (/https?:|www\.|@|<|>/i.test(s)) return 'Use só o seu nome.';
  return '';
};
const checkEmail = (v: string) => {
  const s = v.trim();
  if (!s) return 'Escreva seu e-mail.';
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(s) || /\.\./.test(s)) return 'Esse e-mail parece incompleto. Confira, ex.: voce@gmail.com.';
  return '';
};
const checkPhone = (v: string) => {
  let d = digits(v);
  if (!d) return 'Escreva seu WhatsApp com DDD.';
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if (d.length < 10) return 'Faltam números. Use DDD + número, ex.: (11) 91234-5678.';
  if (d.length > 11) return 'Número longo demais. Use DDD + número.';
  if (!DDD.has(d.slice(0, 2))) return `O DDD ${d.slice(0, 2)} não existe. Confira.`;
  if (d.length === 11 && d[2] !== '9') return 'Celular começa com 9 depois do DDD.';
  if (/^(\d)\1+$/.test(d.slice(2))) return 'Confira o número.';
  return '';
};

// Sugestão para erro de digitação comum no domínio do e-mail.
const DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br', 'yahoo.com', 'icloud.com', 'live.com', 'uol.com.br', 'bol.com.br', 'terra.com.br', 'msn.com', 'outlook.com.br', 'hotmail.com.br'];
const lev = (a: string, b: string) => {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[m][n];
};
const suggestEmail = (v: string) => {
  const [user, dom] = v.trim().toLowerCase().split('@');
  if (!user || !dom || DOMAINS.includes(dom)) return '';
  let best = '', score = 3;
  DOMAINS.forEach((d) => { const s = lev(dom, d); if (s < score) { score = s; best = d; } });
  return best && score <= 2 ? `${user}@${best}` : '';
};

// ---------- campos ----------
const fName = $<HTMLInputElement>('#f-name');
const fEmail = $<HTMLInputElement>('#f-email');
const fPhone = $<HTMLInputElement>('#f-phone');
const fConsent = $<HTMLInputElement>('#f-consent');
const fWebsite = $<HTMLInputElement>('#f-website');
const alertBox = $('.form-alert', form);
const submitBtn = $<HTMLButtonElement>('button[type=submit]', form);

const setErr = (input: HTMLInputElement, msg: string) => {
  const err = document.getElementById(input.getAttribute('aria-describedby') || '');
  if (err) err.textContent = msg;
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  input.classList.toggle('is-valid', !msg && input.type !== 'checkbox' && Boolean(input.value));
};
const touched = new WeakSet<HTMLInputElement>();
const validators: [HTMLInputElement, (v: string) => string][] = [
  [fName, checkName],
  [fEmail, checkEmail],
  [fPhone, checkPhone],
];
validators.forEach(([input, fn]) => {
  input.addEventListener('blur', () => {
    if (!input.value && !touched.has(input)) return;
    touched.add(input);
    setErr(input, fn(input.value));
    if (input === fEmail && !fn(input.value)) showEmailSuggestion();
  });
  input.addEventListener('input', () => {
    if (touched.has(input) && input.getAttribute('aria-invalid') === 'true') setErr(input, fn(input.value));
  });
});
fPhone.addEventListener('input', () => {
  const pos = fPhone.selectionStart ?? fPhone.value.length;
  const before = digits(fPhone.value.slice(0, pos)).length;
  fPhone.value = maskPhone(fPhone.value);
  // mantém o cursor depois do mesmo dígito
  let i = 0, seen = 0;
  while (i < fPhone.value.length && seen < before) { if (/\d/.test(fPhone.value[i])) seen++; i++; }
  try { fPhone.setSelectionRange(i, i); } catch {}
});
fConsent.addEventListener('change', () => { if (fConsent.checked) setErr(fConsent, ''); });

function showEmailSuggestion() {
  const sug = suggestEmail(fEmail.value);
  const err = $('#e-email');
  if (!sug) return;
  err.textContent = '';
  err.style.color = 'var(--text)';
  err.append('Você quis dizer ');
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'link-btn';
  b.textContent = sug;
  b.addEventListener('click', () => { fEmail.value = sug; err.textContent = ''; err.style.color = ''; fEmail.classList.add('is-valid'); fPhone.focus(); });
  err.append(b, '?');
}

// ---------- rede ----------
async function post(body: Record<string, unknown>, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      keepalive: true,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data } as { status: number; data: Record<string, any> };
  } finally {
    clearTimeout(t);
  }
}

// Respostas vão em fila, uma de cada vez, com uma nova tentativa se falhar.
let queue: Promise<unknown> = Promise.resolve();
const saveAnswers = (done = false) => {
  if (!state.id || !state.token) return queue;
  const payload = { action: 'answer', id: state.id, token: state.token, answers: state.answers, other: state.other, done };
  queue = queue.then(async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await post(payload, 8000);
        if (r.status < 500) return r;
      } catch {}
      await new Promise((ok) => setTimeout(ok, 900));
    }
  });
  return queue;
};

// ---------- visão ----------
let lastFocus: HTMLElement | null = null;
const setView = (view: 'form' | 'quiz' | 'resume' | 'done', dir: 'fwd' | 'back' = 'fwd') => {
  funnel.dataset.view = view;
  const el = $(`.view--${view}`, funnel);
  if (!reduced) {
    el.classList.remove('is-entering', 'is-back');
    void el.offsetWidth;
    el.classList.add(dir === 'back' ? 'is-back' : 'is-entering');
  }
  updateSticky();
};
const openSheet = () => {
  if (!mq.matches || funnel.classList.contains('is-sheet')) return;
  lastFocus = document.activeElement as HTMLElement;
  funnel.classList.add('is-sheet');
  funnel.setAttribute('role', 'dialog');
  funnel.setAttribute('aria-modal', 'true');
  funnel.setAttribute('aria-label', 'Lista de acesso antecipado Korvex 2.0');
  document.body.classList.add('is-locked');
  funnel.scrollTop = 0;
};
const closeSheet = () => {
  if (!funnel.classList.contains('is-sheet')) return;
  funnel.classList.remove('is-sheet');
  funnel.removeAttribute('role');
  funnel.removeAttribute('aria-modal');
  funnel.removeAttribute('aria-label');
  document.body.classList.remove('is-locked');
  funnel.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
  lastFocus = null;
};
const setProgress = (fraction: number) => {
  const bar = $<HTMLElement>('.funnel__progress span', funnel);
  if (bar) bar.style.transform = `scaleX(${fraction})`;
};

// ---------- quiz ----------
const ICON_CHECK = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.3l2.3 2.3 4.7-5"/></svg>';
const ICON_BACK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5L5.5 8l4.5 4.5"/></svg>';
const ICON_ARROW = '<svg class="btn__arrow" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5.5l4.5 4.5-4.5 4.5"/></svg>';
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

function renderQuestion(i: number, dir: 'fwd' | 'back' = 'fwd') {
  const q = QUIZ[i];
  state.step = i;
  persist();
  const total = QUIZ.length;
  const chosen = state.answers[q.id];
  const isOn = (v: string) => (Array.isArray(chosen) ? chosen.includes(v) : chosen === v);
  const otherVal = q.other ? state.other[q.id as 'gateway' | 'dor'] || '' : '';
  const showOther = q.other ? isOn(q.other) : false;

  quizView.innerHTML = `
    <div class="q__top">
      <button type="button" class="q__back" data-back ${i === 0 ? 'hidden' : ''}>${ICON_BACK}Voltar</button>
      <span class="q__count">Pergunta ${i + 1} de ${total}</span>
    </div>
    <div class="q__track" aria-hidden="true"><span style="transform:scaleX(${i / total})"></span></div>
    <fieldset class="q">
      <legend tabindex="-1">${esc(q.title)}</legend>
      ${q.hint ? `<p class="q__hint">${esc(q.hint)}</p>` : ''}
      <div class="q__opts">
        ${q.options
          .map(
            (o) => `<label class="opt ${q.type === 'multi' ? 'opt--multi' : ''}">
              <input type="${q.type === 'multi' ? 'checkbox' : 'radio'}" name="q-${q.id}" value="${o.v}" ${isOn(o.v) ? 'checked' : ''} ${o.only ? 'data-only' : ''}>
              <span class="opt__box"><span class="opt__txt">${esc(o.l)}${o.d ? `<small>${esc(o.d)}</small>` : ''}</span><span class="opt__mark">${ICON_CHECK}</span></span>
            </label>${
              q.other === o.v
                ? `<div class="q__other" ${showOther ? '' : 'hidden'}><label class="sr-only" for="q-other">Qual?</label><input id="q-other" type="text" maxlength="60" placeholder="Qual? (opcional)" value="${esc(otherVal)}" autocomplete="off"></div>`
                : ''
            }`,
          )
          .join('')}
      </div>
    </fieldset>
    ${q.type === 'multi' ? `<div class="q__foot"><button type="button" class="btn btn--primary btn--block q__next" data-next ${chosen && (chosen as string[]).length ? '' : 'disabled'}>${i === total - 1 ? 'Concluir' : 'Continuar'}${ICON_ARROW}</button></div>` : ''}
  `;
  setView('quiz', dir);
  setProgress((i + 1) / (total + 1));
  const legend = $<HTMLElement>('legend', quizView);
  requestAnimationFrame(() => legend.focus({ preventScroll: true }));
  if (funnel.classList.contains('is-sheet')) funnel.scrollTop = 0;
  else if (mq.matches) funnel.scrollIntoView({ block: 'start', behavior: 'auto' });
}

function currentValues(q: QuizQuestion) {
  return $$<HTMLInputElement>(`input[name="q-${q.id}"]:checked`, quizView).map((i) => i.value);
}

let advancing = false;
quizView.addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  const q = QUIZ[state.step];
  if (!input.name?.startsWith('q-')) return;

  if (q.type === 'single') {
    state.answers[q.id] = input.value;
    persist();
    saveAnswers(false);
    if (advancing) return;
    advancing = true;
    setTimeout(() => { advancing = false; next(); }, reduced ? 120 : 280);
    return;
  }

  // múltipla escolha: opção "only" é exclusiva
  const boxes = $$<HTMLInputElement>(`input[name="q-${q.id}"]`, quizView);
  if (input.checked && input.hasAttribute('data-only')) boxes.forEach((b) => { if (b !== input) b.checked = false; });
  if (input.checked && !input.hasAttribute('data-only')) boxes.forEach((b) => { if (b.hasAttribute('data-only')) b.checked = false; });
  const vals = currentValues(q);
  if (vals.length) state.answers[q.id] = vals;
  else delete state.answers[q.id];
  if (q.other) {
    const wrap = $<HTMLElement>('.q__other', quizView);
    const on = vals.includes(q.other);
    wrap.hidden = !on;
    if (!on) delete state.other[q.id as 'gateway' | 'dor'];
    if (on && input.value === q.other && input.checked) $<HTMLInputElement>('#q-other', quizView).focus();
  }
  persist();
  $<HTMLButtonElement>('[data-next]', quizView).disabled = vals.length === 0;
});
quizView.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.id !== 'q-other') return;
  const q = QUIZ[state.step];
  state.other[q.id as 'gateway' | 'dor'] = t.value.slice(0, 60);
  persist();
});
quizView.addEventListener('keydown', (e) => {
  const t = e.target as HTMLInputElement;
  if (e.key === 'Enter' && t.id === 'q-other') { e.preventDefault(); $<HTMLButtonElement>('[data-next]', quizView)?.click(); }
});
quizView.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest('button');
  if (!t) return;
  if (t.hasAttribute('data-back')) renderQuestion(Math.max(0, state.step - 1), 'back');
  if (t.hasAttribute('data-next') && !t.hasAttribute('disabled')) { saveAnswers(false); next(); }
});

function next() {
  if (state.step < QUIZ.length - 1) {
    renderQuestion(state.step + 1);
    return;
  }
  finish();
}

async function finish() {
  state.done = true;
  persist();
  showDone();
  track('QuizV2Completo', { content_name: 'korvex-2-lista' }, true);
  await Promise.race([saveAnswers(true), new Promise((ok) => setTimeout(ok, 6000))]);
}

function showDone() {
  $$('[data-first]', funnel).forEach((el) => (el.textContent = state.name ? `, ${first(state.name)}` : ''));
  $('[data-phone]', funnel).textContent = state.phone ? maskPhone(state.phone) : '';
  const msg = `Oi! Entrei na lista da Korvex 2.0. Sou ${state.name || ''}.`.replace(' .', '.');
  $<HTMLAnchorElement>('[data-wa]', funnel).href = `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
  setView('done');
  setProgress(1);
  requestAnimationFrame(() => $<HTMLElement>('.view--done .funnel__title', funnel).focus({ preventScroll: true }));
  if (funnel.classList.contains('is-sheet')) funnel.scrollTop = 0;
}

function showResume() {
  const left = QUIZ.filter((q) => !state.answers[q.id]).length || 1;
  $$('[data-first]', funnel).forEach((el) => (el.textContent = state.name ? `, ${first(state.name)}` : ''));
  $('[data-left]', funnel).textContent = left === 1 ? '1' : String(left);
  setView('resume');
}

// ---------- envio do contato ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertBox.hidden = true;
  let firstBad: HTMLInputElement | null = null;
  validators.forEach(([input, fn]) => {
    touched.add(input);
    const msg = fn(input.value);
    setErr(input, msg);
    if (msg && !firstBad) firstBad = input;
  });
  if (!fConsent.checked) {
    setErr(fConsent, 'Marque a autorização de contato para entrar na lista.');
    firstBad = firstBad || fConsent;
  } else setErr(fConsent, '');
  if (firstBad) { (firstBad as HTMLInputElement).focus(); return; }

  submitBtn.classList.add('is-loading');
  submitBtn.setAttribute('aria-busy', 'true');
  try {
    const { status, data } = await post({
      action: 'create',
      name: fName.value,
      email: fEmail.value,
      phone: fPhone.value,
      consent: true,
      website: fWebsite.value,
      t: Math.round(performance.now() - renderedAt),
      attr,
      page: location.pathname,
    });
    if (status === 422 && data.errors) {
      const map: Record<string, HTMLInputElement> = { name: fName, email: fEmail, phone: fPhone, consent: fConsent };
      let focus: HTMLInputElement | null = null;
      Object.entries(data.errors as Record<string, string>).forEach(([k, msg]) => { if (map[k]) { setErr(map[k], msg); focus = focus || map[k]; } });
      (focus as HTMLInputElement | null)?.focus();
      return;
    }
    if (!data.ok) {
      alertBox.textContent = data.error || 'Não conseguimos salvar agora. Tente de novo em instantes.';
      alertBox.hidden = false;
      return;
    }
    const sameLead = state.id === data.id;
    state = {
      ...(sameLead ? state : { step: 0, answers: {}, other: {}, done: false }),
      id: data.id,
      token: data.token,
      name: fName.value.trim().replace(/\s+/g, ' '),
      email: fEmail.value.trim().toLowerCase(),
      phone: digits(fPhone.value),
    };
    if (data.quizDone) state.done = true;
    persist();
    track('Lead', { content_name: 'korvex-2-lista' }, false, `lead-${data.id}`);

    if (state.done) { openSheet(); showDone(); return; }
    openSheet();
    const firstOpen = QUIZ.findIndex((q) => !state.answers[q.id]);
    renderQuestion(firstOpen === -1 ? 0 : firstOpen);
  } catch {
    alertBox.textContent = 'Sem conexão no momento. Confira a internet e toque de novo em Garantir minha vaga.';
    alertBox.hidden = false;
  } finally {
    submitBtn.classList.remove('is-loading');
    submitBtn.removeAttribute('aria-busy');
  }
});

// ---------- botões soltos ----------
funnel.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest('button, a');
  if (!t) return;
  if (t.hasAttribute('data-close')) {
    if (funnel.dataset.view === 'quiz') { saveAnswers(false); showResume(); }
    closeSheet();
  }
  if (t.hasAttribute('data-resume')) {
    openSheet();
    const firstOpen = QUIZ.findIndex((q) => !state.answers[q.id]);
    renderQuestion(firstOpen === -1 ? QUIZ.length - 1 : firstOpen);
  }
  if (t.hasAttribute('data-edit')) {
    fName.value = state.name || '';
    fEmail.value = state.email || '';
    fPhone.value = maskPhone(state.phone || '');
    fConsent.checked = true;
    closeSheet();
    setView('form', 'back');
    requestAnimationFrame(() => { fPhone.focus(); fPhone.select(); });
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && funnel.classList.contains('is-sheet')) $<HTMLButtonElement>('.funnel__bar [data-close]', funnel).click();
});
mq.addEventListener('change', () => { if (!mq.matches) closeSheet(); });

// Links "Entrar na lista": rola até o cartão e põe o foco no primeiro campo.
$$('[data-goto-form]').forEach((a) =>
  a.addEventListener('click', (e) => {
    e.preventDefault();
    funnel.scrollIntoView({ block: mq.matches ? 'start' : 'center', behavior: reduced ? 'auto' : 'smooth' });
    if (funnel.dataset.view === 'form') setTimeout(() => fName.focus({ preventScroll: true }), reduced ? 0 : 450);
    else if (funnel.dataset.view === 'resume') setTimeout(() => $<HTMLButtonElement>('[data-resume]', funnel).focus({ preventScroll: true }), 450);
  }),
);

// Barra fixa no celular: aparece quando o cartão sai da tela e o lead ainda não entrou.
let cardVisible = true;
let finalVisible = false;
function updateSticky() {
  const on = mq.matches && !cardVisible && !finalVisible && funnel.dataset.view === 'form';
  sticky.hidden = false;
  sticky.classList.toggle('is-on', on);
  sticky.setAttribute('aria-hidden', on ? 'false' : 'true');
  $$<HTMLElement>('a', sticky).forEach((a) => (a.tabIndex = on ? 0 : -1));
}
new IntersectionObserver(([en]) => { cardVisible = en.isIntersecting; updateSticky(); }, { threshold: 0.15 }).observe(funnel);
new IntersectionObserver(([en]) => { finalVisible = en.isIntersecting; updateSticky(); }, { threshold: 0.2 }).observe($('.final'));

// ---------- início ----------
if (state.id && state.done) {
  showDone();
} else if (state.id) {
  showResume();
}
updateSticky();
