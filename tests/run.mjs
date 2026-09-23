import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
await mkdir('work',{recursive:true});
await build({entryPoints:['tests/suite.ts'],bundle:true,platform:'node',format:'esm',outfile:'work/tests.mjs',external:['node:sqlite'],plugins:[{name:'local-database',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:path.resolve('tests/database.ts')}));}}]});
await import(pathToFileURL(path.resolve('work/tests.mjs')).href);
