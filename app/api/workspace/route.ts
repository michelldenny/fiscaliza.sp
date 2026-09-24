import { MAX_IMPORT,validateImport } from '@/lib/import-data';
import { statuses, priorities, validDate, dueDate, today, lastVisit, ensureWorkspaceDefaults, type Data, type Rule, type Action } from '@/lib/domain';
import { readWorkspace,updateWorkspace } from '@/lib/workspace-store';
export const dynamic='force-dynamic';
const respond=(x:unknown,status=200)=>Response.json(x,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){
  try{
    const row=await readWorkspace();
    const user=req.headers.get('oai-authenticated-user-id')||'local';
    let data:Data=JSON.parse(row.payload);
    const { data: updatedData, changed } = ensureWorkspaceDefaults(data);
    let version = row.version;
    if (changed) {
      const ok = await updateWorkspace(JSON.stringify(updatedData), row.version);
      if (ok) version = row.version + 1;
    }
    return respond({...updatedData,version,user});
  }catch(e){
    console.error(e);
    return respond({error:e instanceof Error?e.message:'Não foi possível carregar os dados. Verifique o banco e tente novamente.'},503);
  }
}
function check(ok:unknown,message:string):asserts ok {if(!ok)throw new Error(message);}
function str(x:unknown,max=2000){check(typeof x==='string'&&x.length<=max,'Texto inválido ou muito longo.');return x.trim();}
export async function POST(req:Request){try{
 const origin=req.headers.get('origin');check(!origin||origin===new URL(req.url).origin,'Origem inválida.');
 const body:any=await req.json();const row=await readWorkspace();if(body.version!==row.version)return respond({error:'Os dados foram alterados em outra janela. Atualize a página antes de salvar; copie seu texto para preservá-lo.'},409);
 const data:Data=JSON.parse(row.payload),p=body.payload||{};
 ensureWorkspaceDefaults(data);
 const actor=req.headers.get('oai-authenticated-user-email')||'Operador local';const user=req.headers.get('oai-authenticated-user-id')||'local';const at=new Date().toISOString();let before:unknown=null,after:unknown=null,entity='configuracoes',type='';
 const ruleFor=(id:string)=>{const r=data.rules.find(r=>r.id===id);check(r&&r.active&&r.configured,'Configure e ative a postura antes de utilizá-la.');return r;};
 const makeVisit=(r:Rule,date:string,note:string,inspector:string)=>{check(validDate(date)&&date<=today(),'A data da vistoria deve ser válida e não pode ser futura.');return {id:crypto.randomUUID(),date,note:str(note,8000),inspector:str(inspector,120),due:dueDate(date,r,data.holidays),rule:{...r},holidays:[...data.holidays]};};
 const findAction=()=>{const a=data.actions.find(a=>a.id===p.id&&!a.deleted);check(a,'Demanda não encontrada.');before=structuredClone(a);entity=a.id;return a;};
 if(body.op==='rule'){
  const r=data.rules.find(r=>r.id===p.id);before=r?{...r}:null;const name=str(p.name,150);
  const subtopic=p.subtopic ? str(p.subtopic,150) : '';
  check(name,'Informe o nome da postura.');
  check(!data.rules.some(x=>x.id!==p.id&&x.name.toLocaleLowerCase()===name.toLocaleLowerCase()&&(x.subtopic||'').toLocaleLowerCase()===subtopic.toLocaleLowerCase()),subtopic?'Já existe essa postura com esse sub assunto.':'Já existe uma postura com esse nome.');
  check(Number.isInteger(p.days)&&p.days>=0&&p.days<=3650&&Number.isInteger(p.warning)&&p.warning>=0&&p.warning<=3650,'Prazos devem ser inteiros entre 0 e 3650.');
  check(['corridos','uteis'].includes(p.mode)&&typeof p.active==='boolean','Regra inválida.');
  const next:Rule={id:r?.id||crypto.randomUUID(),name,subtopic:subtopic||undefined,days:p.days,warning:p.warning,mode:p.mode,active:p.active,configured:true};
  if(r)Object.assign(r,next);else data.rules.push(next);
  entity=next.id;after=next;type='Postura configurada';
 }else if(body.op==='inspectors'){
  check(Array.isArray(p.inspectors)&&p.inspectors.every((x:unknown)=>typeof x==='string'&&x.trim().length>0&&x.length<=120),'Lista de fiscais inválida.');
  before=data.inspectors;
  data.inspectors=[...new Set<string>(p.inspectors.map((s:string)=>s.trim()))];
  after=data.inspectors;
  type='Fiscais alterados';
 }else if(body.op==='import'){
  check(Array.isArray(p.rows)&&p.rows.length>0&&p.rows.length<=MAX_IMPORT,`Selecione entre 1 e ${MAX_IMPORT} linhas.`);
  check(p.rows.every((r:any)=>r&&Number.isInteger(r.line)&&r.line>=2&&r.input&&typeof r.input==='object'),'Linhas inválidas.');
  const source=str(p.source,255);const validated=validateImport(p.rows,data);
  const invalid=validated.filter(r=>r.errors.length);check(!invalid.length,invalid.map(r=>`Linha ${r.line}: ${r.errors.join(' ')}`).slice(0,10).join('\n'));
  const batchId=crypto.randomUUID();
  for(const item of validated){
   const {date,...fields}=item.payload;const rule=ruleFor(fields.postureId);
   if(fields.inspector&&!data.inspectors.some(x=>x.toLowerCase()===fields.inspector.toLowerCase())){data.inspectors.push(fields.inspector);}
   const a:Action={...fields,id:crypto.randomUUID(),visits:[makeVisit(rule,date,fields.notes,fields.inspector)],deleted:false,createdAt:at};
   data.actions.push(a);data.audit.unshift({id:crypto.randomUUID(),at,actor,entity:a.id,type:'Demanda importada',before:null,after:{...structuredClone(a),importacao:{arquivo:source,linha:item.line,lote:batchId}}});
  }
  entity=batchId;type='Planilha importada';after={arquivo:source,quantidade:validated.length};
 }else if(body.op==='action'){
  const existing=p.id?findAction():null;const postureId=str(p.postureId,100);const rule=existing&&existing.postureId===postureId?data.rules.find(r=>r.id===postureId)!:ruleFor(postureId);
  check(statuses.includes(p.status)&&priorities.includes(p.priority),'Status ou prioridade inválidos.');
  const fields={postureId,sql:str(p.sql,60),address:str(p.address,500),priority:p.priority,status:p.status,demand:str(p.demand,100),sei:str(p.sei,100),notes:str(p.notes,8000),inspector:str(p.inspector,120)};
  check(fields.address&&fields.inspector&&fields.demand,'Endereço, demanda e fiscal são obrigatórios.');
  check(!data.actions.some(a=>!a.deleted&&a.id!==p.id&&a.demand===fields.demand),'Número de demanda já cadastrado.');
  if(fields.inspector&&!data.inspectors.some(x=>x.toLowerCase()===fields.inspector.toLowerCase())){data.inspectors.push(fields.inspector);}
  if(existing){check(existing.postureId===postureId,'Altere a postura ao registrar uma nova vistoria.');Object.assign(existing,fields);after=existing;type='Cadastro alterado';}
  else{const a:Action={...fields,id:crypto.randomUUID(),visits:[makeVisit(rule,p.date,p.notes,fields.inspector)],deleted:false,createdAt:at};data.actions.push(a);entity=a.id;after=a;type='Demanda cadastrada';}
 }else if(body.op==='visit'){
  const a=findAction();check(statuses.includes(p.status),'Status inválido.');const date=str(p.date,10);check(date>=lastVisit(a).date,'A nova vistoria não pode ser anterior à última.');
  const r=ruleFor(p.postureId||a.postureId);const inspector=str(p.inspector,120);check(inspector&&str(p.note,8000),'Informe o fiscal e o resultado da vistoria.');
  if(inspector&&!data.inspectors.some(x=>x.toLowerCase()===inspector.toLowerCase())){data.inspectors.push(inspector);}
  a.visits.push(makeVisit(r,date,p.note,inspector));a.postureId=r.id;a.inspector=inspector;a.status=p.status;after=a;type='Vistoria registrada';
 }else if(body.op==='delete'){const a=findAction();a.deleted=true;after={deleted:true};type='Demanda excluída';
 }else if(body.op==='holidays'){check(Array.isArray(p.dates)&&p.dates.length<=1000&&p.dates.every((d:unknown)=>typeof d==='string'&&validDate(d)),'Informe datas válidas para os feriados.');before=data.holidays;data.holidays=[...new Set<string>(p.dates)].sort();after=data.holidays;type='Calendário de feriados alterado';
 }else if(body.op==='read'){check(Array.isArray(p.keys)&&p.keys.length<=10000&&p.keys.every((x:unknown)=>typeof x==='string'&&x.length<300),'Notificação inválida.');data.read[user]=[...new Set([...(data.read[user]||[]),...p.keys])];
 }else if(body.op==='deleteRule'){const idx=data.rules.findIndex(r=>r.id===p.id);check(idx!==-1,'Postura não encontrada.');before={...data.rules[idx]};data.rules.splice(idx,1);entity=p.id;after=null;type='Postura excluída';
 }else return respond({error:'Operação desconhecida.'},400);
 if(type)data.audit.unshift({id:crypto.randomUUID(),at,actor,entity,type,before,after:structuredClone(after)});
 if(body.op==='import')check(new TextEncoder().encode(JSON.stringify(data)).length<1900000,'Este lote excede a capacidade atual da área de trabalho. Nenhuma linha foi salva.');
 if(!await updateWorkspace(JSON.stringify(data),row.version))return respond({error:'Conflito de edição. Atualize a página e tente novamente.'},409);
 return respond({...data,version:row.version+1,user});
 }catch(e){console.error(e);return respond({error:e instanceof Error?e.message:'Não foi possível salvar.'},400);}}

