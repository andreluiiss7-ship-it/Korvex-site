// Cliente mínimo do Upstash Redis via REST (sem dependência).
// As variáveis KV_REST_API_URL / KV_REST_API_TOKEN são injetadas pela Vercel
// quando a store Upstash está conectada ao projeto.

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

export const kvReady = () => Boolean(URL_ && TOKEN);

type Cmd = (string | number)[];

async function call(path: string, body: unknown) {
  const res = await fetch(`${URL_}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`kv ${res.status}`);
  return res.json();
}

export async function kv<T = unknown>(...cmd: Cmd): Promise<T> {
  const out = (await call('', cmd)) as { result?: T; error?: string };
  if (out.error) throw new Error(`kv: ${out.error}`);
  return out.result as T;
}

// Várias operações numa transação (MULTI/EXEC).
export async function kvTx(cmds: Cmd[]): Promise<unknown[]> {
  const out = (await call('/multi-exec', cmds)) as { result?: unknown; error?: string }[] | { error: string };
  if (!Array.isArray(out)) throw new Error(`kv: ${out.error}`);
  const err = out.find((r) => r.error);
  if (err) throw new Error(`kv: ${err.error}`);
  return out.map((r) => r.result);
}

// Pipeline sem atomicidade (leituras em lote).
export async function kvPipe(cmds: Cmd[]): Promise<unknown[]> {
  if (!cmds.length) return [];
  const out = (await call('/pipeline', cmds)) as { result?: unknown; error?: string }[];
  return out.map((r) => (r.error ? null : r.result));
}

// Prefixo de todas as chaves desta lista (a store é compartilhável).
export const K = {
  lead: (id: string) => `kx2:lead:${id}`,
  index: 'kx2:leads',
  email: (hash: string) => `kx2:email:${hash}`,
  rate: (bucket: string, ip: string) => `kx2:rl:${bucket}:${ip}`,
};

// Janela fixa: devolve true se ainda está dentro do limite.
export async function allow(bucket: string, ipHash: string, max: number, windowSec: number) {
  const key = K.rate(bucket, ipHash);
  // SET NX cria a janela com TTL só na primeira vez; INCR preserva o TTL.
  const [, count] = (await kvTx([
    ['SET', key, 0, 'EX', windowSec, 'NX'],
    ['INCR', key],
  ])) as [unknown, number];
  return count <= max;
}
