/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,jsx,ts,tsx,mdx}',
    './components/**/*.{js,jsx,ts,tsx,mdx}',
    './pages/**/*.{js,jsx,ts,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          50: 'rgba(255,255,255,0.55)',
          100: 'rgba(255,255,255,0.40)',
          200: 'rgba(255,255,255,0.18)',
          300: 'rgba(255,255,255,0.10)',
          900: 'rgba(0,0,0,0.50)',
        },
        brand: {
          DEFAULT: 'hsl(var(--brand))',
          fg: 'hsl(var(--brand-foreground))',
        },
      },
      boxShadow: {
        glass: '0 8px 30px rgba(0,0,0,0.15)',
        'glass-lg': '0 20px 60px rgba(0,0,0,0.25)',
        bevel:
          'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.2)',
      },
      backdropBlur: { xs: '2px' },
      borderRadius: { xl: '1rem', '2xl': '1.25rem' },
    },
  },
  plugins: [],
};
