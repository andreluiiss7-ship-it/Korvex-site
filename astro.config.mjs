import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  integrations: [tailwind({ applyBaseStyles: false }), sitemap({ filter: (p) => !p.includes('/og') })],
  site: 'https://www.korvexgateway.com',
  // Prefetch automático ao entrar na viewport (zero JS extra pro usuário)
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  build: {
    // inlina CSS pequeno no <head> pra eliminar render-blocking
    inlineStylesheets: 'always',
  },
  vite: {
    build: {
      cssCodeSplit: true,
    },
  },
});
