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
- `tailwind.config.mjs` — paleta (navy/suede/titan/chrome/gold) e animações
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
- Base marinho: `#050B14` / `#0A1A2F`
- Azul camurça (suede): `#3E5C7E` / `#5A7DA1`
- Azul titânio (accent): `#2B5FA0` → `#6FA3E0`
- Prata/cromado: `#C7D2DD`
- Ouro (só no marco de R$1MM): `#C9923A` → `#F5D98B`
