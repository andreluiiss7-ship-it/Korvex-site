// Atribuição + eventos: guarda UTMs/click ids, repassa pro cadastro e pro WhatsApp, dispara eventos do pixel.
const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
const STORE = 'kx_attr';

const read = (): Record<string, string> => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) || '{}');
    const q = new URLSearchParams(location.search);
    const fresh: Record<string, string> = {};
    KEYS.forEach((k) => { const v = q.get(k); if (v) fresh[k] = v; });
    const merged = { ...saved, ...fresh };
    if (Object.keys(fresh).length) sessionStorage.setItem(STORE, JSON.stringify(merged));
    return merged;
  } catch { return {}; }
};

const attr = read();
const ref = (cta: string) => `${attr.utm_campaign || attr.utm_source || 'site'}/${cta}`;

// Repassa pro app e etiqueta o WhatsApp
document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
  const cta = a.dataset.cta || 'link';
  try {
    const u = new URL(a.href);
    if (u.hostname === 'app.korvex.com.br') {
      Object.entries(attr).forEach(([k, v]) => u.searchParams.set(k, v));
      u.searchParams.set('ref', cta);
      a.href = u.toString();
    } else if (u.hostname === 'wa.me') {
      const t = u.searchParams.get('text') || '';
      u.searchParams.set('text', `${t} [ref: ${ref(cta)}]`);
      a.href = u.toString();
    }
  } catch {}
});

// Eventos por clique (delegado)
type Fbq = ((...args: unknown[]) => void) | undefined;
document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
  if (!a) return;
  const href = a.href;
  const name = a.dataset.cta || 'link';
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  let ev: string | null = null;
  if (href.includes('wa.me')) ev = 'Lead';
  else if (href.includes('app.korvex.com.br')) ev = 'InitiateCheckout';
  if (!ev) return;
  if (fbq) fbq('track', ev, { content_name: name });
  else console.debug('[korvex] evento', ev, name);
});
