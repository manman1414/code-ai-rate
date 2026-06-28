const esbuild = require('esbuild');
const fs = require('fs');
const production = process.argv.includes('--production');

esbuild
  .build({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outfile: 'dist/extension.js',
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    sourcemap: !production,
    minify: production,
  })
  .then(() => {
    fs.copyFileSync('src/reporter/default.hbs', 'dist/default.hbs');
  })
  .catch(() => process.exit(1));
