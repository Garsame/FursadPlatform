/** @type {import('tailwindcss').Config} */

/**
 * JobAssistAI design system — "Optimistic Professional"
 *
 * Two-tier green instead of one:
 *   brand.deep  (#0B5C43) carries STRUCTURE — nav, headings, footer, dark bands.
 *   brand.green (#00C27C) is reserved for ACTION — CTAs, match scores, active
 *                         states. Because it is rationed, it actually pops.
 *   accent.ochre          adds human warmth so the palette never reads clinical.
 *
 * Contrast note: #00C27C is a light green. White text on it fails WCAG (~2.1:1),
 * so anything sitting on brand.green uses brand.ink (#06231A) instead — ~8:1.
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary:  '#FAF9F6', // warm paper — page background
          surface:  '#FFFFFF', // cards, nav, panels
          elevated: '#F1F0EA', // hover states, subtle fills
          deep:     '#0B5C43', // evergreen bands, footer
          deeper:   '#073D2C', // deepest band / footer base
        },
        border: {
          subtle: '#E7E4DB',
          strong: '#CFCABC',
          onDeep: 'rgba(255,255,255,0.14)',
        },
        brand: {
          green:     '#00C27C', // ACTION ONLY
          hover:     '#00A868',
          deep:      '#0B5C43', // STRUCTURE
          deepHover: '#084835',
          muted:     'rgba(0, 194, 124, 0.10)',
          ink:       '#06231A', // text that sits on brand.green
        },
        accent: {
          ochre:      '#E0A340',
          ochreMuted: 'rgba(224, 163, 64, 0.16)',
          ochreInk:   '#8A5A0B', // ochre legible as text on light
        },
        text: {
          primary:   '#0F1F1A', // near-black green ink
          secondary: '#4A5A52',
          muted:     '#6B7A73',
          inverse:   '#F4F8F6', // on deep green
          onDeepDim: 'rgba(244,248,246,0.72)',
        },
        danger:  '#C93636',
        warning: '#A96D0A', // legible as text; use accent.ochre for fills
        success: '#0B8F5F',
        info:    '#2563EB',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      borderRadius: {
        card:  '14px',
        input: '10px',
        btn:   '10px',
        pill:  '999px',
      },
      spacing: {
        '4xs': '4px',
        '3xs': '8px',
        '2xs': '12px',
        'xs':  '16px',
        'sm':  '24px',
        'md':  '32px',
        'lg':  '48px',
        'xl':  '64px',
        '2xl': '80px',
        '3xl': '96px',
      },
      height: {
        navbar: '72px',
        input:  '46px',
        btn:    '46px',
      },
      width: {
        sidebar: '240px',
      },
      maxWidth: {
        prose: '68ch',
      },
      boxShadow: {
        // On light surfaces elevation comes from shadow, not borders.
        card: '0 1px 2px rgba(15,31,26,0.04), 0 8px 24px -14px rgba(15,31,26,0.14)',
        lift: '0 2px 6px rgba(15,31,26,0.06), 0 20px 44px -18px rgba(15,31,26,0.22)',
        ring: '0 0 0 4px rgba(0,194,124,0.20)',
        deep: '0 24px 60px -24px rgba(7,61,44,0.45)',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'marquee': {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'marquee': 'marquee 32s linear infinite',
      },
    },
  },
  plugins: [],
}
