/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        // Base neutra (grafite da marca)
        abyss: '#0D0D0F',
        ink: '#111111',
        // Cinza quente para hairlines e superfícies de mockup
        ash: {
          600: '#3F3E3A',
          500: '#5E5C57',
          400: '#7C7A74',
          300: '#A09D96',
        },
        // Azul titânio (accent)
        titan: {
          600: '#2B5FA0',
          500: '#3E78C0',
          400: '#6FA3E0',
        },
        // Prata / cromado
        chrome: {
          300: '#C9C4BB',
          200: '#DEDAD2',
          100: '#F0EDE7',
        },
        // Verde: dinheiro que caiu / aprovado / ao vivo
        live: {
          400: '#34D399',
          500: '#22C08A',
        },
        // Osso: a única seção clara
        bone: {
          50: '#F3EEE6',
          100: '#EDE7DD',
          200: '#E6DFD3',
        },
        // Ouro — reservado ao marco de R$1MM
        gold: {
          600: '#C9923A',
          400: '#E7BE6A',
          300: '#F5D98B',
        },
      },
      fontFamily: {
        display: ['"Inter Tight"', 'system-ui', 'sans-serif'],
        sans: ['"Inter Tight"', 'system-ui', 'sans-serif'],
        editorial: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        depth: '0 1px 0 rgba(255,255,255,0.06) inset, 0 20px 50px -20px rgba(0,0,0,0.7)',
        glow: '0 0 0 1px rgba(111,163,224,0.18), 0 30px 80px -30px rgba(43,95,160,0.55)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px)',
      },
      keyframes: {
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        floaty: 'floaty 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
