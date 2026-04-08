interface FileIconProps {
  filename: string;
  className?: string;
}

const EXT_MAP: Record<string, { color: string; label: string }> = {
  // JavaScript / TypeScript
  ts: { color: '#3178c6', label: 'TS' },
  tsx: { color: '#3178c6', label: 'TX' },
  js: { color: '#f7df1e', label: 'JS' },
  jsx: { color: '#f7df1e', label: 'JX' },
  mjs: { color: '#f7df1e', label: 'MJ' },
  cjs: { color: '#f7df1e', label: 'CJ' },

  // Web
  html: { color: '#e34f26', label: 'H' },
  css: { color: '#1572b6', label: 'C' },
  scss: { color: '#cc6699', label: 'SC' },
  less: { color: '#1d365d', label: 'LE' },
  svg: { color: '#ffb13b', label: 'SV' },
  vue: { color: '#42b883', label: 'V' },
  svelte: { color: '#ff3e00', label: 'SV' },

  // Data / Config
  json: { color: '#a8b9cc', label: '{}' },
  yaml: { color: '#cb171e', label: 'YA' },
  yml: { color: '#cb171e', label: 'YA' },
  toml: { color: '#9c4121', label: 'TM' },
  xml: { color: '#e37933', label: 'XM' },
  env: { color: '#ecd53f', label: 'EN' },
  ini: { color: '#8c8c8c', label: 'IN' },

  // Languages
  py: { color: '#3776ab', label: 'PY' },
  rb: { color: '#cc342d', label: 'RB' },
  go: { color: '#00add8', label: 'GO' },
  rs: { color: '#dea584', label: 'RS' },
  java: { color: '#b07219', label: 'JA' },
  kt: { color: '#a97bff', label: 'KT' },
  swift: { color: '#f05138', label: 'SW' },
  c: { color: '#555555', label: 'C' },
  cpp: { color: '#f34b7d', label: 'C+' },
  h: { color: '#555555', label: 'H' },
  cs: { color: '#178600', label: 'C#' },
  php: { color: '#4f5d95', label: 'PH' },
  lua: { color: '#000080', label: 'LU' },
  dart: { color: '#00b4ab', label: 'DA' },
  zig: { color: '#f7a41d', label: 'ZI' },

  // Shell / Scripts
  sh: { color: '#89e051', label: 'SH' },
  bash: { color: '#89e051', label: 'BA' },
  zsh: { color: '#89e051', label: 'ZS' },
  fish: { color: '#89e051', label: 'FI' },
  ps1: { color: '#012456', label: 'PS' },

  // Docs
  md: { color: '#083fa1', label: 'MD' },
  mdx: { color: '#083fa1', label: 'MX' },
  txt: { color: '#8c8c8c', label: 'TX' },
  rst: { color: '#141414', label: 'RS' },
  tex: { color: '#3D6117', label: 'TX' },

  // Images
  png: { color: '#a4c639', label: 'PN' },
  jpg: { color: '#a4c639', label: 'JP' },
  jpeg: { color: '#a4c639', label: 'JP' },
  gif: { color: '#a4c639', label: 'GI' },
  webp: { color: '#a4c639', label: 'WP' },
  ico: { color: '#a4c639', label: 'IC' },

  // Build / Package
  lock: { color: '#8c8c8c', label: 'LK' },
  dockerfile: { color: '#384d54', label: 'DK' },
  makefile: { color: '#427819', label: 'MK' },

  // Git
  gitignore: { color: '#f05032', label: 'GI' },
  gitmodules: { color: '#f05032', label: 'GM' },
  gitattributes: { color: '#f05032', label: 'GA' },
};

const SPECIAL_FILES: Record<string, { color: string; label: string }> = {
  'package.json': { color: '#cb3837', label: 'NP' },
  'tsconfig.json': { color: '#3178c6', label: 'TS' },
  'vite.config.ts': { color: '#646cff', label: 'VI' },
  '.eslintrc': { color: '#4b32c3', label: 'ES' },
  '.prettierrc': { color: '#f7b93e', label: 'PR' },
  'Dockerfile': { color: '#384d54', label: 'DK' },
  'Makefile': { color: '#427819', label: 'MK' },
  'LICENSE': { color: '#d4a017', label: 'LI' },
  'README.md': { color: '#083fa1', label: 'RE' },
};

export function FileIcon({ filename, className = '' }: FileIconProps) {
  const basename = filename.split('/').pop() || filename;
  const special = SPECIAL_FILES[basename];

  let ext = '';
  if (!special) {
    const dotParts = basename.split('.');
    if (basename.startsWith('.')) {
      ext = basename.slice(1).toLowerCase();
    } else if (dotParts.length > 1) {
      ext = dotParts.pop()!.toLowerCase();
    }
  }

  const mapping = special || EXT_MAP[ext];

  if (!mapping) {
    return (
      <div
        className={`w-4 h-4 rounded flex items-center justify-center text-[7px] font-bold bg-tertiary text-tertiary ${className}`}
      >
        F
      </div>
    );
  }

  return (
    <div
      className={`w-4 h-4 rounded flex items-center justify-center text-[7px] font-bold flex-shrink-0 ${className}`}
      style={{
        backgroundColor: mapping.color + '22',
        color: mapping.color,
      }}
      title={basename}
    >
      {mapping.label}
    </div>
  );
}
