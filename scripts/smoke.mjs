#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {getDb,REPO_ROOT} from './lib/db.mjs';import {migrate} from './migrate.mjs';import {run,commands,parse,date,cents} from './budget.mjs';import {parseCsv} from './lib/csv.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'marketing-budget-test-'));
process.env.DATA_DIR=path.join(temp,'db');process.env.OUTPUT_DIR=temp;process.env.DATABASE_URL=process.env.TEST_DATABASE_URL||'';
let db,n=0;const seen=new Set();const eq=(a,b)=>{assert.deepEqual(a,b);n++;};const ok=v=>{assert.ok(v);n++;};const reject=async(f,re)=>{await assert.rejects(f,re);n++;};
const day=(offset=0)=>new Date(Date.now()+offset*86400000).toISOString().slice(0,10);
const call=async(c,o={})=>{seen.add(c);return run(db,c,o);};
try {
 db=await getDb();if(process.env.TEST_DATABASE_URL){const existing=await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");if(existing.length)throw Error('TEST_DATABASE_URL must be an empty disposable database');}
 eq((await migrate(db)).ran.length,1);eq((await migrate(db)).ran.length,0);
 const seed=fs.readFileSync(path.join(REPO_ROOT,'supabase/seed.sql'),'utf8');await db.exec(seed);await db.exec(seed);
 eq((await call('budgets')).length,2);eq((await call('campaigns')).length,3);
 const budgets=await call('budget-review');const nz=budgets.find(x=>x.code==='NZ-ANNUAL');eq(Number(nz.actual_cents),1400000);eq(Number(nz.projected_cents),4500000);eq(Number(nz.headroom_cents),5500000);
 const campaigns=await call('campaign-review');const partner=campaigns.find(x=>x.code==='PARTNER-NZ');eq(Number(partner.projected_cents),3700000);eq(Number(partner.outstanding_cents),2700000);eq(Number(partner.headroom_cents),-200000);
 eq((await call('cost-review')).length,4);eq((await call('commitments-due')).length,3);eq((await call('reforecast-due')).length,2);eq((await call('over-budget')).length,1);eq((await call('actions-due')).length,2);
 const compliance=await call('compliance');ok(compliance.some(x=>x.rule==='EXPENSE-EVIDENCE'));ok(compliance.some(x=>x.rule==='NZ-RETENTION'));ok(compliance.some(x=>x.rule==='COMMITMENT-EVIDENCE'));
 eq((await call('activity')).length,0);eq((await call('help')).length,commands.length);
 eq((await call('campaign',{campaign:'partner-nz'})).costs.length,2);await reject(()=>call('campaign',{campaign:'partner breakfast'}),/Ambiguous[\s\S]*PARTNER-AU/);await reject(()=>call('campaign',{campaign:'missing'}),/No matching/);
 const b=await call('add-budget',{code:'TEST',name:'<script>alert(1)</script>',owner:'Test',currency:'NZD',start:'2020-01-01',end:'2100-01-01',amount:'1000.00',evidence:'Approved','tax-year-end':'2026-03-31','retain-until':'2033-03-31',review:day(30),actor:'Operator'});
 const c=await call('add-campaign',{budget:b.id,code:'TEST-CAMP',name:'Test campaign',owner:'Test',channel:'Editorial',start:'2020-01-01',end:'2100-01-01',amount:'500.00',actor:'Operator'});
 const l=await call('add-cost',{campaign:c.id,reference:'TEST-COST',name:'Design',supplier:'Studio',planned:'100.00',committed:'80.00',forecast:'110.00','forecast-date':day(-1),due:day(10),evidence:'PO test',actor:'Operator'});
 const a=await call('record-actual',{line:l.id,reference:'TINV',date:day(),amount:'30.01',evidence:'Invoice test',actor:'Finance'});
 let spend=(await call('cost-review')).find(x=>x.reference==='TEST-COST');eq(Number(spend.actual_cents),3001);eq(Number(spend.outstanding_cents),4999);eq(Number(spend.projected_cents),11000);
 await reject(()=>call('record-actual',{line:l.id,reference:'TINV',date:day(),amount:'30.00',evidence:'Dup',actor:'Finance'}),/unique|duplicate/);
 await call('reforecast',{line:l.id,forecast:'50.00',date:day(),reason:'Review',actor:'Operator'});spend=(await call('cost-review')).find(x=>x.reference==='TEST-COST');eq(Number(spend.projected_cents),8000);
 await call('set-commitment',{line:l.id,amount:'20.00',evidence:'Credit agreement',reason:'Scope reduction',actor:'Operator'});
 await call('reforecast',{line:l.id,forecast:'10.00',date:day(),reason:'Reduce',actor:'Operator'});spend=(await call('cost-review')).find(x=>x.reference==='TEST-COST');eq(Number(spend.projected_cents),3001);eq(Number(spend.outstanding_cents),0);
 await call('void-actual',{actual:a.id,reason:'Wrong invoice',actor:'Finance'});spend=(await call('cost-review')).find(x=>x.reference==='TEST-COST');eq(Number(spend.actual_cents),0);eq(Number(spend.projected_cents),2000);
 await reject(()=>call('void-actual',{actual:a.id,reason:'Repeat',actor:'Finance'}),/already voided/);
 await reject(()=>db.query('DELETE FROM actuals WHERE id=$1',[a.id]),/never deleted/);await reject(()=>db.query('UPDATE actuals SET amount_cents=999 WHERE id=$1',[a.id]),/only be voided/);
 await reject(()=>call('reforecast',{line:l.id,forecast:'1.00',date:day(-1),reason:'Backdate',actor:'A'}),/backwards/);
 await reject(()=>call('reforecast',{line:l.id,forecast:'1.00',date:day(1),reason:'Future',actor:'A'}),/future/);
 await reject(()=>call('record-actual',{line:l.id,reference:'BAD',date:day(),amount:'0',evidence:'Test',actor:'A'}),/check constraint/);
 await reject(()=>call('add-campaign',{budget:b.id,code:'OUT',name:'Outside',owner:'Test',channel:'Editorial',start:'2019-01-01',end:'2019-12-31',amount:'1',actor:'A'}),/outside/);
 const action=await call('log-action',{campaign:c.id,note:'Check result',owner:'A',due:day(-2),actor:'A'});ok((await call('actions-due')).some(x=>x.id===action.id));await call('close-action',{action:action.id,resolution:'Evidence filed',actor:'A'});ok(!(await call('actions-due')).some(x=>x.id===action.id));await reject(()=>call('close-action',{action:action.id,resolution:'Again',actor:'A'}),/already closed/);
 await call('review-records',{budget:b.id,'tax-year-end':'2026-03-31','retain-until':'2027-03-31',review:day(-1),evidence:'Review',actor:'A'});ok((await call('compliance')).some(x=>x.record==='TEST'&&x.rule==='NZ-RETENTION'));
 await call('review-records',{budget:b.id,'tax-year-end':'2026-03-31','retain-until':'2033-03-31',review:day(30),evidence:'Review',actor:'A'});ok(!(await call('compliance')).some(x=>x.record==='TEST'));
 const original=fs.readFileSync(path.join(REPO_ROOT,'fixtures/marmind-costs.csv'),'utf8').replaceAll('2026-11-01',day(-1)).replaceAll('2026-12-01',day(10)).replaceAll('2026-12-02',day(11));const file=path.join(temp,'source.csv');fs.writeFileSync(file,original);
 eq((await call('import',{campaign:c.id,file,actor:'A','dry-run':true})).inserted,2);eq((await db.query('SELECT * FROM imports')).length,0);
 eq((await call('import',{campaign:c.id,file,actor:'A'})).inserted,2);ok((await call('import',{campaign:c.id,file,actor:'A'})).already_imported);
 eq((await db.query('SELECT original_csv FROM imports'))[0].original_csv,original);eq((await db.query("SELECT source_row FROM cost_lines WHERE reference='IMP-001'"))[0].source_row['Custom note'],'Preserve this, too');
 spend=(await call('cost-review')).find(x=>x.reference==='IMP-001');eq(Number(spend.projected_cents),110000);eq(Number(spend.actual_cents),30000);eq(Number(spend.forecast_cents),110000);
 ok((await call('compliance')).some(x=>x.rule==='OPENING-RECONCILIATION'));
 const bad=path.join(temp,'bad.csv');fs.writeFileSync(bad,original.replace('1000.00','1000.01'));await reject(()=>call('import',{campaign:c.id,file:bad,actor:'A'}),/Duplicate reference/);
 fs.writeFileSync(bad,original.replaceAll('IMP-','BAD-').replace('NZD','AUD'));await reject(()=>call('import',{campaign:c.id,file:bad,actor:'A'}),/currency mismatch/);
 fs.writeFileSync(bad,original.replaceAll('IMP-','BAD-').replace('500.00','-1'));await reject(()=>call('import',{campaign:c.id,file:bad,actor:'A'}),/non-negative/);eq((await db.query("SELECT * FROM cost_lines WHERE reference LIKE 'BAD-%'")).length,0);eq((await db.query('SELECT * FROM imports')).length,1);
 fs.writeFileSync(bad,original.replaceAll('IMP-','MAPPED-').replace('Supplier,','Provider,'));const map=path.join(temp,'map.json');fs.writeFileSync(map,JSON.stringify({supplier:'Provider'}));eq((await call('import',{campaign:c.id,file:bad,map,actor:'A'})).inserted,2);
 fs.writeFileSync(map,JSON.stringify({notAField:'Provider'}));await reject(()=>call('import',{campaign:c.id,file:bad,map,actor:'A'}),/Invalid mapping/);
 await reject(()=>db.query('DELETE FROM imports'),/append-only/);await reject(()=>db.query("UPDATE activity SET actor='changed'"),/append-only/);
 const out=path.join(temp,'snapshot.json');await call('export',{out});const snap=JSON.parse(fs.readFileSync(out));eq(Object.keys(snap.records).length,7);eq(snap.records.imports.length,2);ok(snap.records.actuals.some(x=>x.void_reason));await reject(()=>call('export',{out}),/EEXIST/);
 ok(fs.readFileSync((await call('weekly-review')).file,'utf8').includes('reforecast-due'));
 const draft=fs.readFileSync((await call('draft-budget-review',{budget:b.id})).file,'utf8');ok(draft.includes('&lt;script&gt;'));ok(!draft.includes('<script>alert'));
 for(const v of ['2026-02-30','2026-1-01','invalid']){assert.throws(()=>date(v));n++;}
 for(const v of ['-1','1e3','1,000','0.001','Infinity','10000000001']){assert.throws(()=>cents(v));n++;}eq(cents('0.29'),29);
 for(const args of [['help','extra'],['help','--json=false'],['budgets','--unknown'],['import','other'],['add-cost','--actor=A','--actor=B']]){assert.throws(()=>parse(args));n++;}
 eq(parseCsv('\uFEFFA,B\r\n"a\nb","c""d"\r\n'),[{A:'a\nb',B:'c"d'}]);for(const s of ['A,a\n1,2','A,B\n1','A,B\n"bad,2']){assert.throws(()=>parseCsv(s));n++;}
 eq((await db.query("SELECT relname FROM pg_class WHERE relname IN ('budgets','campaigns','cost_lines','actuals','actions','imports','activity') AND relrowsecurity")).length,7);
 eq(commands.filter(c=>!seen.has(c)),[]);await db.close();db=null;
 for(const script of ['view','docs']){const r=spawnSync(process.execPath,[`scripts/${script}.mjs`],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});if(r.status)console.error(r.stderr);eq(r.status,0);}
 const cli=spawnSync(process.execPath,['scripts/budget.mjs','budgets','--json'],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});eq(cli.status,0);eq(JSON.parse(cli.stdout).length,3);
 const ambiguous=spawnSync(process.execPath,['scripts/budget.mjs','campaign','--campaign=partner breakfast'],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});eq(ambiguous.status,1);ok(ambiguous.stderr.includes('PARTNER-AU'));
 console.log(`PASS: ${n} assertions; ${seen.size} CLI commands; ${process.env.DATABASE_URL?'PostgreSQL':'PGlite'}; temporary database and output.`);
}catch(e){console.error(e.stack);process.exitCode=1;}finally{if(db)await db.close();fs.rmSync(temp,{recursive:true,force:true});}
