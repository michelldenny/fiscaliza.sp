import { priorities,statuses,today,validDate,type Data } from './domain';
export const MAX_IMPORT=200;
export const importFields=[['posture','Postura'],['demand','Nº da demanda'],['address','Endereço'],['date','Data da última vistoria'],['inspector','Fiscal'],['sql','SQL'],['sei','Nº do processo SEI'],['priority','Prioridade'],['status','Status da ação'],['notes','Observações']] as const;
export type ImportField=typeof importFields[number][0];
export type ImportInput=Record<ImportField,string>;
export type ImportRow={line:number;input:ImportInput};
export type ImportResult={line:number;input:ImportInput;errors:string[];payload:{postureId:string;demand:string;address:string;date:string;inspector:string;sql:string;sei:string;priority:string;status:string;notes:string}};
export const cellText=(value:unknown)=>value==null?'':String(value);
export const rowHasContent=(cells:readonly unknown[])=>cells.some(cell=>cellText(cell).trim().length>0);
export const normalize=(value:unknown)=>cellText(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases:Record<ImportField,string[]>={posture:['postura','tipo de postura'],demand:['demanda','numero demanda','n demanda','nº demanda','nº da demanda','numero da demanda'],address:['endereco','logradouro'],date:['data','data vistoria','ultima vistoria','data ultima vistoria','data da ultima vistoria'],inspector:['fiscal','fiscal responsavel','responsavel'],sql:['sql','setor quadra lote'],sei:['sei','processo','processo sei','nº do processo sei','numero processo sei'],priority:['prioridade','nivel de prioridade'],status:['status','status da acao','situacao da acao'],notes:['obs','observacoes','observacao']};
export function autoMapping(headers:readonly unknown[]){return Object.fromEntries(importFields.map(([key])=>[key,headers.findIndex(h=>aliases[key].some(alias=>normalize(alias)===normalize(h)))])) as Record<ImportField,number>;}
export function parseDate(value:string){const s=value.trim();if(validDate(s))return s;const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);if(m){const date=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;return validDate(date)?date:'';}return '';}
export function validateImport(rows:ImportRow[],data:Pick<Data,'rules'|'actions'>):ImportResult[]{
 const seen=new Set(data.actions.filter(a=>!a.deleted).map(a=>a.demand));
 return rows.map(({line,input})=>{
  const get=(k:ImportField)=>typeof input?.[k]==='string'?input[k].trim():'';
  const errors:string[]=[];const posture=get('posture');const rule=data.rules.find(r=>normalize(r.name)===normalize(posture)||(r.subtopic&&normalize(r.subtopic)===normalize(posture))||(r.subtopic&&normalize(`${r.name} ${r.subtopic}`)===normalize(posture))||(r.subtopic&&normalize(`${r.name} - ${r.subtopic}`)===normalize(posture))||r.id===posture);
  if(!rule||!rule.active||!rule.configured)errors.push('Postura não encontrada, inativa ou com prazo não validado.');
  const demand=get('demand'),address=get('address'),inspector=get('inspector'),date=parseDate(get('date'));
  if(!demand)errors.push('Nº da demanda obrigatório.');if(!address)errors.push('Endereço obrigatório.');if(!inspector)errors.push('Fiscal obrigatório.');if(!date||date>today())errors.push('Data da vistoria inválida ou futura (use DD/MM/AAAA).');
  if(demand&&seen.has(demand))errors.push('Nº de demanda já cadastrado ou repetido nesta planilha.');
  const priority=priorities.find(v=>normalize(v)===normalize(get('priority')||'Média'));
  const status=statuses.find(v=>normalize(v)===normalize(get('status')||statuses[0]));
  if(!priority)errors.push('Prioridade inválida: use Baixa, Média ou Alta.');if(!status)errors.push('Status da ação não reconhecido.');
  for(const [k,label]of importFields){const max=k==='notes'?8000:k==='address'?500:k==='inspector'?120:k==='sql'?60:150;if(get(k).length>max)errors.push(`${label}: máximo de ${max} caracteres.`);if(get(k).includes('[FÓRMULA:')||get(k).includes('[ERRO NA CÉLULA]'))errors.push(`${label}: substitua fórmulas ou erros por valores na planilha.`);}
  // Only a valid row reserves its number, so an earlier invalid row never hides a usable one.
  if(demand&&!errors.length)seen.add(demand);
  return {line,input,errors,payload:{postureId:rule?.id||'',demand,address,inspector,date,sql:get('sql'),sei:get('sei'),notes:get('notes'),priority:priority||'',status:status||''}};
 });
}
export function parseCSV(text:string):string[][]{
 text=text.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/,1)[0];
 let quoted=false;const counts:Record<string,number>={';':0,',':0,'\t':0};for(let i=0;i<first.length;i++){if(first[i]==='"'){if(quoted&&first[i+1]==='"')i++;else quoted=!quoted;}else if(!quoted&&first[i] in counts)counts[first[i]]++;}
 const delimiter=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
 const rows:string[][]=[];let row:string[]=[],cell='',inside=false,closed=false;
 const endCell=()=>{row.push(cell);cell='';closed=false;};const endRow=()=>{endCell();rows.push(row);row=[];if(rows.length>MAX_IMPORT+1)throw Error(`Importe até ${MAX_IMPORT} linhas por vez.`);};
 for(let i=0;i<text.length;i++){const c=text[i];if(inside){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{inside=false;closed=true;}}else cell+=c;}else if(c===delimiter)endCell();else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;endRow();}else if(c==='"'&&cell===''){inside=true;}else{if(closed&&c.trim())throw Error('CSV inválido: conteúdo após o fechamento de aspas.');if(!closed)cell+=c;}}
 if(inside)throw Error('CSV inválido: aspas não fechadas.');if(cell||row.length||closed)endRow();return rows;
}
