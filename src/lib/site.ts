// Configurações globais da Korvex
export const WHATSAPP_NUMBER = '5512997391545';

const baseMsg = encodeURIComponent(
  'Olá! Vim pelo site da Korvex e quero falar com um especialista sobre migrar minha operação.'
);

export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${baseMsg}`;

export const waUrl = (text: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

export const APP_URL = 'https://app.korvex.com.br';
export const REGISTER_URL = 'https://app.korvex.com.br/register';

export const STATS = {
  players: '400+',
  volume: 'R$129M+',
  approval: '94%',
  countries: '46+',
};
