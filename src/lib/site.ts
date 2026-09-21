// Configurações globais da Korvex
export const WHATSAPP_NUMBER = '5512997391545';

// Duas mensagens só: proposta (CTAs de venda) e dúvida (FAQ, rodapé)
export const WA_PROPOSTA = 'Olá! Quero receber a proposta da Korvex pra minha operação em até 1h.';
export const WA_DUVIDA = 'Olá! Tenho uma dúvida sobre a Korvex.';

export const waUrl = (text: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

export const WHATSAPP_URL = waUrl(WA_PROPOSTA);
export const WHATSAPP_DUVIDA_URL = waUrl(WA_DUVIDA);

export const SITE_URL = 'https://www.korvexgateway.com';
export const APP_URL = 'https://app.korvex.com.br';
export const REGISTER_URL = 'https://app.korvex.com.br/register';

// Meta Pixel: definir PUBLIC_META_PIXEL_ID no .env / Vercel. Sem ID, nada é injetado.
export const META_PIXEL_ID = (import.meta.env.PUBLIC_META_PIXEL_ID as string | undefined) ?? '';

// Fonte única dos números de prova
export const STATS = {
  volume: 'R$ 129 mi+',
  volumeN: 129,
  players: '400+',
  playersN: 400,
  approval: '94%',
  approvalN: 94,
  uptime: '99,9%',
  uptimeN: 99.9,
};
