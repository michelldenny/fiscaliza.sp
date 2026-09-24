export const statuses = ['Em acompanhamento','Aguardando retorno','Aguardando atendimento da intimação','Aguardando apoio técnico','Aguardando análise de processo','Regularizado','Encerrado','Suspenso'];
export const priorities = ['Baixa','Média','Alta'];
export const deadlines = ['Retorno atrasado','Retorno hoje','Atenção','No prazo'];

export type Rule = {
  id: string;
  name: string;
  subtopic?: string;
  days: number;
  warning: number;
  mode: 'corridos' | 'uteis';
  active: boolean;
  configured: boolean;
};

export type Visit = { id:string; date:string; note:string; inspector:string; due:string; rule:Rule; holidays:string[] };
export type Action = { id:string; postureId:string; sql:string; address:string; priority:string; status:string; demand:string; sei:string; notes:string; inspector:string; visits:Visit[]; deleted:boolean; createdAt:string };
export type Audit = { id:string; at:string; actor:string; entity:string; type:string; before:unknown; after:unknown };
export type Data = { rules:Rule[]; inspectors:string[]; actions:Action[]; holidays:string[]; audit:Audit[]; read:Record<string,string[]> };

export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function validDate(s:string) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s; }
export function addDays(s:string,n:number) { const d=new Date(s+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }
export const daysBetween = (a:string,b:string) => Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);
export function dueDate(s:string,r:Rule,holidays:string[]=[]) { let d=s,n=0; while(n<r.days){d=addDays(d,1); const w=new Date(d+'T12:00:00Z').getUTCDay(); if(r.mode==='corridos'||(w!==0&&w!==6&&!holidays.includes(d))) n++;} return d; }
export const lastVisit = (a:Action) => a.visits[a.visits.length-1];
export const active = (a:Action) => !a.deleted&&!['Regularizado','Encerrado','Suspenso'].includes(a.status);
export function situation(a:Action,now=today()) { if(!active(a)) return 'Sem retorno ativo'; const v=lastVisit(a),delta=daysBetween(now,v.due); return delta<0?deadlines[0]:delta===0?deadlines[1]:delta<=v.rule.warning?deadlines[2]:deadlines[3]; }
export const notificationKey=(a:Action)=>a.id+':'+lastVisit(a).id+':'+situation(a);
export const formatDate=(s:string)=>s?s.split('-').reverse().join('/'):'—';

export const defaultInspectors = [
  'Daviceli',
  'Lizandra',
  'Marcelo',
  'Carlos Pachá',
  'Amanda',
  'Samara',
  'Bia',
  'Felipe',
  'Fabíola',
  'Caroline',
  'Michell',
  'Drailton',
  'Gabriel',
  'Giancarlo',
];

export const defaultObraIrregularSubtopics = [
  'Avançar grua sobre o espaço público',
  'Avançar tapume sobre parte do passeio público',
  'Executar demolição de edificação',
  'Executar edificação nova',
  'Executar edificação nova - moradia econômica',
  'Executar edificação nova - templo religioso',
  'Executar movimento de terra',
  'Executar muro de arrimo',
  'Executar reconstrução de edificação que sofreu sinistro',
  'Executar reforma de edificação',
  'Executar reforma de edificação - moradia econômica',
  'Executar reforma de edificação - templo religioso',
  'Executar requalificação de edificação',
  'Implantar canteiro de obras em imóvel distinto',
  'Implantar edificação transitória',
  'Implantar equipamento transitório',
  'Implantar estande de vendas em imóvel distinto.',
  'Utilizar edificação transitória',
  'Utilizar equipamento transitório',
];

export const otherDefaultPostures = [
  'Conservação de passeios',
  'Limpeza de terrenos',
  'Publicidade e anúncios',
  'Comércio e serviços',
  'Ocupação de área pública',
  'Poluição sonora',
];

export function ruleFullName(r: { name: string; subtopic?: string }) {
  return r.subtopic ? `${r.name} — ${r.subtopic}` : r.name;
}

export function initialData(): Data {
  const rules: Rule[] = [
    ...defaultObraIrregularSubtopics.map((subtopic, i) => ({
      id: `p-obra-${i + 1}`,
      name: 'Obra Irregular',
      subtopic,
      days: 30,
      warning: 5,
      mode: 'corridos' as const,
      active: true,
      configured: true,
    })),
    ...otherDefaultPostures.map((name, i) => ({
      id: `p-outra-${i + 1}`,
      name,
      subtopic: '',
      days: 30,
      warning: 5,
      mode: 'corridos' as const,
      active: true,
      configured: false,
    })),
  ];

  return {
    rules,
    inspectors: [...defaultInspectors],
    actions: [],
    holidays: [],
    audit: [],
    read: {},
  };
}

export function ensureWorkspaceDefaults(data: Data): { data: Data; changed: boolean } {
  let changed = false;

  if (!Array.isArray(data.inspectors)) {
    data.inspectors = [...defaultInspectors];
    changed = true;
  } else {
    for (const insp of defaultInspectors) {
      if (!data.inspectors.some(x => x.toLowerCase() === insp.toLowerCase())) {
        data.inspectors.push(insp);
        changed = true;
      }
    }
  }

  if (!Array.isArray(data.rules)) {
    data.rules = [];
  }

  defaultObraIrregularSubtopics.forEach((subtopic, idx) => {
    const exists = data.rules.some(
      r => r.name.toLowerCase() === 'obra irregular' && (r.subtopic || '').toLowerCase() === subtopic.toLowerCase()
    );
    if (!exists) {
      data.rules.push({
        id: `p-obra-${idx + 1}-${Date.now().toString(36)}`,
        name: 'Obra Irregular',
        subtopic,
        days: 30,
        warning: 5,
        mode: 'corridos',
        active: true,
        configured: true,
      });
      changed = true;
    }
  });

  return { data, changed };
}

