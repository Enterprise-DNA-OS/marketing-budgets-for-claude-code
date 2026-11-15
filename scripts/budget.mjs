#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { parseCsv } from './lib/csv.mjs';
import { table } from './lib/format.mjs';
import { page, table as htmlTable, record, writeOut } from './lib/render.mjs';

export const spec = {
 help: [], budgets: [], campaigns: [], 'budget-review': [], 'campaign-review': [],
 'cost-review': [], 'commitments-due': [], 'reforecast-due': [], 'over-budget': [], 'actions-due': [], compliance: [], activity: [],
 campaign: ['campaign'],
 'add-budget': ['code','name','owner','currency','start','end','amount','evidence','tax-year-end','retain-until','review','actor'],
 'add-campaign': ['budget','code','name','owner','channel','start','end','amount','actor'],
 'add-cost': ['campaign','reference','name','supplier','planned','committed','forecast','forecast-date','due','evidence','actor'],
 'record-actual': ['line','reference','date','amount','evidence','actor'],
 'void-actual': ['actual','reason','actor'],
 reforecast: ['line','forecast','date','reason','actor'],
 'set-commitment': ['line','amount','evidence','reason','actor'],
 'log-action': ['campaign','note','owner','due','actor'],
 'close-action': ['action','resolution','actor'],
 'review-records': ['budget','tax-year-end','retain-until','review','evidence','actor'],
 import: ['campaign','file','map','dry-run','actor'], export: ['out'],
 'weekly-review': [], 'draft-budget-review': ['budget']
};
export const commands = Object.keys(spec);
export function parse(args) {
 let command=args.shift()||'help'; const opts={};
 if(command==='import' && args.shift()!=='marmind') throw Error('Use import marmind');
 if(!(command in spec)) throw Error(`Unknown command ${command}. Use help.`);
 for(const arg of args) {
  const m=arg.match(/^--([a-z-]+)(?:=(.*))?$/s);
  if(!m || ![...spec[command],'json'].includes(m[1])) throw Error(`Unsupported argument: ${arg}`);
  if(m[1] in opts) throw Error(`Duplicate flag ${m[1]}`);
  if(['json','dry-run'].includes(m[1])) {if(m[2]!==undefined) throw Error(`--${m[1]} takes no value`);opts[m[1]]=true;}
  else {if(!m[2]?.trim()) throw Error(`--${m[1]} needs a value`);opts[m[1]]=m[2];}
 }
 return {command,opts};
}
const need=(o,k)=>{if(typeof o[k]!=='string'||!o[k].trim())throw Error(`Missing --${k}=value`);return o[k].trim();};
export function date(value) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw Error(`Invalid ISO date: ${value}`);
 return value;
}
export function cents(value) {
 const s=String(value);if(!/^\d+(?:\.\d{1,2})?$/.test(s))throw Error(`Use non-negative decimal money without separators: ${s}`);
 const [whole,frac='']=s.split('.'); const n=Number(whole)*100+Number(frac.padEnd(2,'0'));
 if(!Number.isSafeInteger(n)||n>1000000000000)throw Error('Amount exceeds supported range');return n;
}
const d=(o,k)=>date(need(o,k)); const m=(o,k)=>cents(need(o,k));
const TABLES=['budgets','campaigns','cost_lines','actuals','actions','imports','activity'];
export async function resolve(db,kind,value) {
 const columns={budgets:['code','name'],campaigns:['code','name'],cost_lines:['reference','name'],actuals:['reference'],actions:['note']}[kind];
 if(!columns)throw Error('Unknown record type');
 const rows=await db.query(`SELECT * FROM ${kind} ORDER BY created_at,id`);
 const q=String(value).toLowerCase();
 let matches=rows.filter(r=>r.id===value||columns.some(c=>String(r[c]).toLowerCase()===q));
 if(!matches.length)matches=rows.filter(r=>r.id.startsWith(q)||columns.some(c=>String(r[c]).toLowerCase().includes(q)));
 if(matches.length!==1)throw Error(`${matches.length?'Ambiguous':'No matching'} ${kind}: ${value}${matches.length?'\n'+matches.map(r=>`${r.id}  ${columns.map(c=>r[c]).join(' | ')}`).join('\n'):''}`);
 return matches[0];
}
const get=(db,kind,o,k)=>resolve(db,kind,need(o,k));
async function audit(db,actor,operation,r,detail) {await db.query('INSERT INTO activity(actor,operation,record_id,detail) VALUES($1,$2,$3,$4)',[actor,operation,r.id,JSON.stringify(detail)]);}
async function insert(db,kind,row) {
 if(!TABLES.includes(kind))throw Error('Unknown table');
 const keys=Object.keys(row);return (await db.query(`INSERT INTO ${kind}(${keys.join(',')}) VALUES(${keys.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,Object.values(row)))[0];
}
function between(day,parent) {if(day<parent.starts_on||day>parent.ends_on)throw Error(`Date ${day} is outside ${parent.starts_on} to ${parent.ends_on}`);}
function today(){return new Date().toISOString().slice(0,10);}
function noFuture(day){if(day>today())throw Error('Actual and forecast dates cannot be in the future');return day;}
export const queries={
 budgets:'SELECT code,name,owner,currency,starts_on,ends_on,approved_cents FROM budgets ORDER BY code',
 campaigns:'SELECT code,name,owner,channel,currency,allocation_cents,starts_on,ends_on FROM campaign_spend ORDER BY code',
 'budget-review':'SELECT code,currency,approved_cents,allocated_cents,actual_cents,projected_cents,headroom_cents,unallocated_cents FROM budget_spend ORDER BY code',
 'campaign-review':'SELECT code,owner,currency,allocation_cents,actual_cents,outstanding_cents,projected_cents,headroom_cents,stale_forecasts FROM campaign_spend ORDER BY code',
 'cost-review':'SELECT campaign,reference,supplier,currency,planned_cents,committed_cents,actual_cents,outstanding_cents,forecast_cents,projected_cents,variance_cents FROM line_spend ORDER BY campaign,reference',
 'commitments-due':"SELECT campaign,reference,supplier,owner,currency,outstanding_cents,due_on FROM line_spend WHERE outstanding_cents>0 AND due_on<=current_date+14 ORDER BY due_on,campaign,reference",
 'reforecast-due':'SELECT campaign,reference,owner,currency,projected_cents,forecast_on,forecast_age_days FROM line_spend WHERE forecast_age_days>14 ORDER BY forecast_on,campaign,reference',
 'over-budget':'SELECT code,owner,currency,allocation_cents,projected_cents,headroom_cents FROM campaign_spend WHERE headroom_cents<0 ORDER BY code',
 'actions-due':"SELECT c.code campaign,a.id,a.note,a.owner,a.due_on FROM actions a JOIN campaigns c ON c.id=a.campaign_id WHERE a.closed_at IS NULL AND a.due_on<=current_date+7 ORDER BY a.due_on,c.code",
 compliance:'SELECT * FROM compliance_issues ORDER BY rule,record',
 activity:'SELECT actor,operation,record_id,detail,created_at FROM activity ORDER BY created_at,id'
};
export function human(value) {
 if(Array.isArray(value)) {
  if(!value.length)return '  (none)';
  return table(value,Object.keys(value[0]).map(key=>({key,label:key.replace(/_cents$/,'').replaceAll('_',' '),format:(v,r)=>key.endsWith('_cents')?`${r.currency||''} ${(Number(v)/100).toFixed(2)}`.trim():typeof v==='object'?JSON.stringify(v):v})));
 }
 return JSON.stringify(value,null,2);
}
async function importCosts(db,o) {
 const campaign=await get(db,'campaigns',o,'campaign');const budget=(await db.query('SELECT * FROM budgets WHERE id=$1',[campaign.budget_id]))[0];
 const file=need(o,'file'),actor=need(o,'actor'); const csv=fs.readFileSync(file,'utf8');
 if(!/\.csv$/i.test(file))throw Error('Export the Excel detail worksheet as UTF-8 CSV first');
 const defaults={reference:'Reference',name:'Name',supplier:'Supplier',currency:'Currency',planned:'Planned',committed:'Committed',forecast:'Forecast',actual:'Actual','forecast-date':'Forecast date',due:'Due date',evidence:'Evidence'};
 const custom=o.map?JSON.parse(fs.readFileSync(o.map,'utf8')):{};
 if(!custom||Array.isArray(custom)||typeof custom!=='object'||Object.entries(custom).some(([k,v])=>!(k in defaults)||typeof v!=='string'||!v.trim()))throw Error('Invalid mapping; use canonical field names from docs/replace-marmind.md');
 const mapping={...defaults,...custom}; if(new Set(Object.values(mapping).map(x=>x.toLowerCase())).size!==Object.keys(mapping).length)throw Error('Mapping must use distinct source columns');
 const fingerprint=createHash('sha256').update(campaign.id+'\n'+JSON.stringify(mapping)+'\n'+csv).digest('hex');
 const prior=await db.query('SELECT id,row_count FROM imports WHERE fingerprint=$1',[fingerprint]);if(prior.length)return {already_imported:true,...prior[0]};
 const rows=parseCsv(csv);if(!rows.length)throw Error('Empty import');
 const refs=new Set();const prepared=rows.map((row,i)=>{
  const v={};for(const [key,header]of Object.entries(mapping)){if(!(header in row))throw Error(`Missing column: ${header}`);v[key]=row[header].trim();}
  for(const key of ['reference','name','supplier','currency','planned','committed','forecast','actual','forecast-date','due'])if(!v[key])throw Error(`Row ${i+2}: missing ${key}`);
  if(v.currency!==budget.currency)throw Error(`Row ${i+2}: currency mismatch ${v.currency} / ${budget.currency}`);
  if(refs.has(v.reference))throw Error(`Duplicate reference ${v.reference}`);refs.add(v.reference);
  const actual=cents(v.actual),forecast=cents(v.forecast);if(forecast<actual)throw Error(`Row ${i+2}: total forecast is below actual spend`);
  const forecast_on=noFuture(date(v['forecast-date'])),due_on=date(v.due);between(due_on,campaign);between(forecast_on,budget);
  return {line:{campaign_id:campaign.id,reference:v.reference,name:v.name,supplier:v.supplier,planned_cents:cents(v.planned),committed_cents:cents(v.committed),forecast_cents:forecast,forecast_on,due_on,evidence:v.evidence,source_row:JSON.stringify(row)},actual};
 });
 const existing=await db.query('SELECT reference FROM cost_lines WHERE campaign_id=$1',[campaign.id]);
 for(const r of existing)if(refs.has(r.reference))throw Error(`Duplicate reference ${r.reference}; changed exports require a reviewed adjustment`);
 if(o['dry-run'])return {dry_run:true,inserted:prepared.length,currency:budget.currency,actual_cents:prepared.reduce((n,x)=>n+x.actual,0),planned_cents:prepared.reduce((n,x)=>n+x.line.planned_cents,0)};
 const imp=await insert(db,'imports',{campaign_id:campaign.id,fingerprint,filename:path.basename(file),original_csv:csv,mapping:JSON.stringify(mapping),actor,row_count:prepared.length});
 for(const row of prepared){const line=await insert(db,'cost_lines',row.line);if(row.actual)await insert(db,'actuals',{line_id:line.id,reference:`opening:${line.reference}`,spent_on:line.forecast_on,amount_cents:row.actual,evidence:line.evidence,source_kind:'opening-export',actor});}
 await audit(db,actor,'import',imp,{campaign:campaign.code,rows:prepared.length,fingerprint});
 return {inserted:prepared.length,import_id:imp.id,currency:budget.currency};
}
async function execute(db,command,o) {
 if(command in queries)return db.query(queries[command]);
 if(command==='help')return commands.map(name=>({command:name,flags:spec[name].join(', ')}));
 if(command==='campaign'){
  const c=await get(db,'campaigns',o,'campaign');return {campaign:c,spend:(await db.query('SELECT * FROM campaign_spend WHERE id=$1',[c.id]))[0],costs:await db.query('SELECT * FROM line_spend WHERE campaign_id=$1 ORDER BY reference',[c.id]),actions:await db.query('SELECT * FROM actions WHERE campaign_id=$1 ORDER BY due_on',[c.id])};
 }
 if(command==='import')return importCosts(db,o);
 if(command==='export') {
  const records={};for(const t of TABLES)records[t]=await db.query(`SELECT * FROM ${t} ORDER BY created_at,id`);
  const file=path.resolve(need(o,'out'));fs.writeFileSync(file,JSON.stringify({format:1,at:new Date().toISOString(),records},null,2)+'\n',{flag:'wx',mode:0o600});return {file,record_count:Object.values(records).reduce((n,x)=>n+x.length,0)};
 }
 if(command==='weekly-review') {
  const sections=[];for(const name of ['budget-review','reforecast-due','actions-due'])sections.push({title:name,html:htmlTable(await db.query(queries[name]))});
  const file=writeOut('drafts',`weekly-review-${randomUUID()}`,page({title:'Monday marketing budget review',subtitle:'Draft for internal review. No messages sent.',sections}));return {file};
 }
 if(command==='draft-budget-review') {
  const b=await get(db,'budgets',o,'budget'); const summary=(await db.query('SELECT * FROM budget_spend WHERE id=$1',[b.id]))[0];
  return {file:writeOut('drafts',`budget-${b.id}-${randomUUID()}`,page({title:'Marketing budget review',subtitle:'Working forecast, not an accounting statement.',sections:[{title:b.code,html:record(summary)},{title:'Campaigns',html:htmlTable(await db.query('SELECT * FROM campaign_spend WHERE budget_id=$1 ORDER BY code',[b.id]))}]}))};
 }
 const actor=need(o,'actor');let r,detail;
 if(command==='add-budget') {
  const currency=need(o,'currency');if(!/^[A-Z]{3}$/.test(currency))throw Error('Currency must have three uppercase letters');
  r=await insert(db,'budgets',{code:need(o,'code'),name:need(o,'name'),owner:need(o,'owner'),currency,starts_on:d(o,'start'),ends_on:d(o,'end'),approved_cents:m(o,'amount'),evidence:need(o,'evidence'),tax_year_end:d(o,'tax-year-end'),retain_until:d(o,'retain-until'),review_on:d(o,'review')});
 }else if(command==='add-campaign') {
  const b=await get(db,'budgets',o,'budget');between(d(o,'start'),b);between(d(o,'end'),b);
  r=await insert(db,'campaigns',{budget_id:b.id,code:need(o,'code'),name:need(o,'name'),owner:need(o,'owner'),channel:need(o,'channel'),starts_on:d(o,'start'),ends_on:d(o,'end'),allocation_cents:m(o,'amount')});
 }else if(command==='add-cost') {
  const c=await get(db,'campaigns',o,'campaign');between(d(o,'due'),c);
  r=await insert(db,'cost_lines',{campaign_id:c.id,reference:need(o,'reference'),name:need(o,'name'),supplier:need(o,'supplier'),planned_cents:m(o,'planned'),committed_cents:m(o,'committed'),forecast_cents:m(o,'forecast'),forecast_on:noFuture(d(o,'forecast-date')),due_on:d(o,'due'),evidence:need(o,'evidence')});
 }else if(command==='record-actual') {
  const l=await get(db,'cost_lines',o,'line');const c=(await db.query('SELECT * FROM campaigns WHERE id=$1',[l.campaign_id]))[0];const b=(await db.query('SELECT * FROM budgets WHERE id=$1',[c.budget_id]))[0];between(noFuture(d(o,'date')),b);
  r=await insert(db,'actuals',{line_id:l.id,reference:need(o,'reference'),spent_on:d(o,'date'),amount_cents:m(o,'amount'),evidence:need(o,'evidence'),actor});
 }else if(command==='void-actual') {
  const a=await get(db,'actuals',o,'actual');if(a.void_at)throw Error('Actual already voided');
  r=(await db.query('UPDATE actuals SET void_reason=$1,void_actor=$2,void_at=now() WHERE id=$3 RETURNING *',[need(o,'reason'),actor,a.id]))[0];detail={before:a,after:r};
 }else if(command==='reforecast') {
  const l=await get(db,'cost_lines',o,'line');const day=noFuture(d(o,'date'));if(day<l.forecast_on)throw Error('Forecast date cannot go backwards');
  r=(await db.query('UPDATE cost_lines SET forecast_cents=$1,forecast_on=$2 WHERE id=$3 RETURNING *',[m(o,'forecast'),day,l.id]))[0];detail={reason:need(o,'reason'),before:l,after:r};
 }else if(command==='set-commitment') {
  const l=await get(db,'cost_lines',o,'line');r=(await db.query('UPDATE cost_lines SET committed_cents=$1,evidence=$2 WHERE id=$3 RETURNING *',[m(o,'amount'),need(o,'evidence'),l.id]))[0];detail={reason:need(o,'reason'),before:l,after:r};
 }else if(command==='log-action') {
  const c=await get(db,'campaigns',o,'campaign');r=await insert(db,'actions',{campaign_id:c.id,note:need(o,'note'),owner:need(o,'owner'),due_on:d(o,'due')});
 }else if(command==='close-action') {
  const a=await get(db,'actions',o,'action');if(a.closed_at)throw Error('Action already closed');r=(await db.query('UPDATE actions SET resolution=$1,closed_at=now() WHERE id=$2 RETURNING *',[need(o,'resolution'),a.id]))[0];detail={before:a,after:r};
 }else if(command==='review-records') {
  const b=await get(db,'budgets',o,'budget');r=(await db.query('UPDATE budgets SET tax_year_end=$1,retain_until=$2,review_on=$3,evidence=$4 WHERE id=$5 RETURNING *',[d(o,'tax-year-end'),d(o,'retain-until'),d(o,'review'),need(o,'evidence'),b.id]))[0];detail={before:b,after:r};
 }else throw Error(`Not implemented: ${command}`);
 await audit(db,actor,command,r,detail||r);return r;
}
export async function run(db,command,opts={}) {
 if(!(command in spec))throw Error('Unknown command');
 const mutating=spec[command].includes('actor')&&!opts['dry-run'];
 await db.exec(mutating?'BEGIN':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 try {
  // All application mutations use the same transaction lock order.
  if(mutating)await db.query('SELECT id FROM budgets ORDER BY id FOR UPDATE');
  const result=await execute(db,command,opts);await db.exec('COMMIT');return result;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
 let db;
 try {const {command,opts}=parse(process.argv.slice(2));db=await getDb();const result=await run(db,command,opts);console.log(opts.json?JSON.stringify(result):human(result));}
 catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}
}
