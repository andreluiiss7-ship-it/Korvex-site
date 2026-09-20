# Korvex — Site institucional

Landing page premium do gateway de pagamentos Korvex, voltada a infoprodutores,
coprodutores, experts, lançadores e sellers de alto faturamento.

Stack: **Astro 4 + Tailwind CSS** (saída estática, ideal para Vercel).

## Rodar localmente
```bash
npm install
npm run dev      # http://localhost:4321
```

## Build / Deploy
```bash
npm run build    # gera /dist (estático)
npm run preview  # pré-visualiza o build
```
Deploy na Vercel: importe o repositório, framework **Astro** é detectado
automaticamente (build `astro build`, output `dist`).

## Estrutura
- `src/pages/index.astro` — monta todas as seções
- `src/components/` — Nav, Hero, Authority, Features, Checkout, Payments, Funnel,
  Members, Global, Awards, Comparison, FinalCTA, FAQ, Footer
- `src/lib/site.ts` — WhatsApp, URL do app e números de autoridade (**editar aqui**)
- `src/lib/icons.ts` — ícones SVG inline
- `src/styles/global.css` — design tokens, glass, cards, botões
- `tailwind.config.mjs` — paleta (ash/titan/chrome/gold/live/bone) e animações
- `public/assets/` — logos, placas reais, dashboard real, mockups

## Pontos para personalizar
- **WhatsApp / números**: `src/lib/site.ts` (`WHATSAPP_NUMBER`, `STATS`).
- **Mockups codados** (checkout, funil, área de membros): são componentes HTML/CSS
  on-brand. Para trocar por prints reais do gateway, basta substituir o bloco do
  mockup por uma `<img>` dentro do mesmo `.browser`.
- **Imagem real usada**: dashboard (`/assets/dashboard.png`) e placas
  (`/assets/placa-*.jpg`, `/assets/pulseira-10k.png`).
- **Links legais** no footer estão como `#` — apontar para as páginas reais.

## Paleta
- Base grafite neutra: `#0D0D0F` / `#141414` / `#1A1A1A` (tokens `--bg-0..4`)
- Texto cinza quente: `#F4F2EE` / `#B5B0A8` / `#837F78`
- Azul titânio = produto e interação: `#3B82F6` / `#6FA0FF` (só em botões, foco e telas do produto)
- Ouro = dinheiro que fica e marcos: `#C9A35E` → `#E2C386`
- Verde = dinheiro que caiu, aprovado, D0: `#34D399`
- Osso = uma seção clara (Fundador): `#F3EEE6` via `[data-surface="light"]`
