// Fonte única do quiz da lista Korvex 2.0: a página usa para desenhar as telas
// e a função usa para validar o que chega. Mudou pergunta? Muda só aqui.

export type QuizOption = { v: string; l: string; d?: string; only?: boolean };
export type QuizQuestion = {
  id: 'vende' | 'faturamento' | 'gateway' | 'dor' | 'quando';
  title: string;
  hint?: string;
  type: 'single' | 'multi';
  other?: string; // valor da opção que abre o campo "qual?"
  options: QuizOption[];
};

export const QUIZ: QuizQuestion[] = [
  {
    id: 'vende',
    title: 'O que você vende hoje?',
    hint: 'Escolha o principal.',
    type: 'single',
    options: [
      { v: 'curso', l: 'Curso ou treinamento online' },
      { v: 'mentoria', l: 'Mentoria ou consultoria' },
      { v: 'entrada', l: 'Produto de entrada', d: 'E-book, desafio, guia' },
      { v: 'assinatura', l: 'Assinatura ou comunidade' },
      { v: 'fisico', l: 'Produto físico' },
      { v: 'outro', l: 'Outra coisa' },
    ],
  },
  {
    id: 'faturamento',
    title: 'Quanto a sua operação fatura por mês?',
    hint: 'Média dos últimos três meses. Fica só entre a gente.',
    type: 'single',
    options: [
      { v: 'zero', l: 'Ainda não faturo' },
      { v: 'ate10k', l: 'Até R$ 10 mil' },
      { v: '10k-50k', l: 'De R$ 10 mil a R$ 50 mil' },
      { v: '50k-100k', l: 'De R$ 50 mil a R$ 100 mil' },
      { v: '100k-500k', l: 'De R$ 100 mil a R$ 500 mil' },
      { v: '500k-1m', l: 'De R$ 500 mil a R$ 1 milhão' },
      { v: '1m+', l: 'Acima de R$ 1 milhão' },
    ],
  },
  {
    id: 'gateway',
    title: 'Qual gateway ou plataforma você usa hoje?',
    hint: 'Marque todas que você usa.',
    type: 'multi',
    other: 'outra',
    options: [
      { v: 'korvex', l: 'Korvex (versão atual)' },
      { v: 'hotmart', l: 'Hotmart' },
      { v: 'kiwify', l: 'Kiwify' },
      { v: 'kirvano', l: 'Kirvano' },
      { v: 'ticto', l: 'Ticto' },
      { v: 'eduzz', l: 'Eduzz' },
      { v: 'cakto', l: 'Cakto' },
      { v: 'outra', l: 'Outra' },
      { v: 'nenhuma', l: 'Ainda não vendo online', only: true },
    ],
  },
  {
    id: 'dor',
    title: 'O que mais te incomoda no gateway atual?',
    hint: 'Marque tudo que pesa hoje.',
    type: 'multi',
    other: 'outro',
    options: [
      { v: 'taxa', l: 'Taxa alta' },
      { v: 'saque', l: 'Demora para sacar' },
      { v: 'aprovacao', l: 'Aprovação baixa no cartão' },
      { v: 'med', l: 'MED e chargeback' },
      { v: 'suporte', l: 'Suporte que não resolve' },
      { v: 'retido', l: 'Saldo retido ou conta bloqueada' },
      { v: 'outro', l: 'Outra coisa' },
    ],
  },
  {
    id: 'quando',
    title: 'Quando você pretende migrar?',
    type: 'single',
    options: [
      { v: 'abrir', l: 'Assim que abrir' },
      { v: '30d', l: 'Nos próximos 30 dias' },
      { v: '90d', l: 'Em 1 a 3 meses' },
      { v: 'conhecer', l: 'Só quero conhecer por enquanto' },
    ],
  },
];

export const QUIZ_BY_ID = Object.fromEntries(QUIZ.map((q) => [q.id, q])) as Record<QuizQuestion['id'], QuizQuestion>;

export const labelOf = (qid: QuizQuestion['id'], v: string): string =>
  QUIZ_BY_ID[qid]?.options.find((o) => o.v === v)?.l ?? v;

// Texto do consentimento gravado junto do lead (prova de consentimento, LGPD).
export const CONSENT_VERSION = 'v2-lista-2026-10-09';
export const CONSENT_TEXT =
  'Aceito que a Korvex fale comigo por WhatsApp e e-mail sobre a Korvex 2.0 e a lista de acesso antecipado. Li a Política de Privacidade.';
