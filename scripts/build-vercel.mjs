import { fileURLToPath } from 'node:url';

process.env.VERCEL ||= '1';
process.env.NITRO_PRESET ||= 'vercel';
const cli=new URL('../node_modules/vite/bin/vite.js',import.meta.url);
process.argv=[process.execPath,fileURLToPath(cli),'build'];
await import(cli.href);
