import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary: 'var(--color-bg-tertiary)',
          hover: 'var(--color-bg-hover)',
          active: 'var(--color-bg-active)',
          input: 'var(--color-bg-input)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          placeholder: 'var(--color-text-placeholder)',
          inverse: 'var(--color-text-inverse)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          subtle: 'var(--color-border-subtle)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          muted: 'var(--color-accent-muted)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          muted: 'var(--color-success-muted)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          muted: 'var(--color-danger-muted)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          muted: 'var(--color-warning-muted)',
        },
        diff: {
          'add-bg': 'var(--color-diff-add-bg)',
          'add-line': 'var(--color-diff-add-line)',
          'del-bg': 'var(--color-diff-del-bg)',
          'del-line': 'var(--color-diff-del-line)',
          'hunk-bg': 'var(--color-diff-hunk-bg)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      spacing: {
        titlebar: 'var(--titlebar-height)',
        sidebar: 'var(--sidebar-width)',
      },
    },
  },
  plugins: [],
};

export default config;
