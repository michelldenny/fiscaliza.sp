import { readFileSync,writeFileSync,mkdirSync,readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const config=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
const root=process.cwd();
config.main=path.join(root,'dist/server/index.js');
config.assets={...config.assets,directory:path.join(root,'dist/client')};
config.d1_databases=config.d1_databases.map(d=>({...d,migrations_dir:path.join(root,'drizzle')}));
mkdirSync('.sites-runtime',{recursive:true});
writeFileSync('.sites-runtime/local-db.json',JSON.stringify(config,null,2));
const r=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config','.sites-runtime/local-db.json','--persist-to',process.env.FISCALIZA_LOCAL_STATE||'.wrangler/state'],{stdio:'inherit'});
process.exit(r.status??1);

