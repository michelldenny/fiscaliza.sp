import { MAX_IMPORT,parseCSV } from './import-data';
export type SheetData={name:string;rows:string[][]};
export async function readSpreadsheet(file:File):Promise<SheetData[]>{
 if(file.size>5*1024*1024)throw Error('O arquivo deve ter no máximo 5 MB.');
 const ext=file.name.split('.').pop()?.toLowerCase(),bytes=await file.arrayBuffer();
 if(ext==='csv'){let text:string;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{text=new TextDecoder('windows-1252').decode(bytes);}return [{name:'CSV',rows:parseCSV(text)}];}
 if(ext!=='xlsx')throw Error('Selecione um arquivo .xlsx ou .csv. Para arquivos .xls, salve uma cópia como .xlsx.');
 const {default:ExcelJS}=await import('exceljs');const workbook=new ExcelJS.Workbook();
 try{await workbook.xlsx.load(bytes);}catch{throw Error('Não foi possível ler o Excel. Verifique se o arquivo é .xlsx válido e não está protegido por senha.');}
 return workbook.worksheets.filter(s=>s.state==='visible').map(sheet=>{
  const rows:string[][]=[];if(sheet.actualRowCount>MAX_IMPORT+1)throw Error(`A aba “${sheet.name}” excede ${MAX_IMPORT} linhas. Divida o arquivo em lotes.`);
  if(sheet.columnCount>100)throw Error('A planilha deve ter no máximo 100 colunas.');
  sheet.eachRow({includeEmpty:true},row=>{if(row.number>MAX_IMPORT+1)throw Error(`Remova linhas vazias antes dos dados. Máximo: ${MAX_IMPORT} linhas e um cabeçalho.`);const values:string[]=[];
   for(let i=1;i<=sheet.columnCount;i++){const cell=row.getCell(i);let value=cell.value;
    if(value&&typeof value==='object'&&('formula'in value||'sharedFormula'in value)){values.push('[FÓRMULA: substitua pelo valor]');continue;}
    if(value instanceof Date){values.push(value.toISOString().slice(0,10));continue;}
    if(value&&typeof value==='object'&&'richText'in value){values.push(value.richText.map(p=>p.text).join(''));continue;}
    if(value&&typeof value==='object'&&'hyperlink'in value){values.push(value.text);continue;}
    if(value&&typeof value==='object'&&'error'in value){values.push('[ERRO NA CÉLULA]');continue;}
    if(typeof value==='number'&&/^0+$/.test(cell.numFmt||''))values.push(String(value).padStart(cell.numFmt.length,'0'));
    else values.push(value==null?'':String(value));
   }rows.push(values);
  });return {name:sheet.name,rows};
 });
}
