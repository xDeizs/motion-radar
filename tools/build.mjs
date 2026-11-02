// Bundles web/experience/main.mjs into assets/js/experience.js (classic script, works from file:// too).
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nodePaths = process.env.MR_NODE_PATH ? process.env.MR_NODE_PATH.split(path.delimiter) : [];
await build({
  entryPoints: [path.join(root, 'web/experience/main.mjs')],
  outfile: path.join(root, 'assets/js/experience.js'),
  bundle: true, minify: true, format: 'iife', target: ['es2020'], legalComments: 'eof',
  nodePaths, logLevel: 'info',
  banner: { js: '/* Motion Radar 5 experience · three.js (MIT), GSAP (Standard no-charge license), Lenis (MIT). Source: web/experience/ */' },
});
