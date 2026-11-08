import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {seed} from './seed.mjs';
import {run,resolve,commands,reads,entities} from './accreditation.mjs';
import {parseCsv} from './lib/csv.mjs';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'accreditation-test-'));
const schema='test_'+Date.now();
process.env.DATA_DIR=path.join(tmp,'db');process.env.OUTPUT_DIR=tmp;
process.env.DATABASE_URL=process.env.TEST_DATABASE_URL||'';
let db;let count=0;const covered=new Set();
const today=new Date().toISOString().slice(0,10);
const date=days=>new Date(Date.now()+days*86400000).toISOString().slice(0,10);
const check=async(name,fn)=>{await fn();count++;console.log('PASS '+name);};
const call=async(cmd,opts={},args=[])=>{const out=await run(db,cmd,opts,args);covered.add(cmd);return out;};
const bad=async(fn,re)=>assert.rejects(fn,re);
const sqlBad=async(sql,params=[])=>{await db.exec('begin');try{await assert.rejects(()=>db.query(sql,params));}finally{await db.exec('rollback');}};
try{
 db=await getDb();
 if(db.mode==='postgres'){
  await db.exec(`create schema ${schema}; set search_path to ${schema},public`);
  const u=new URL(process.env.DATABASE_URL);u.searchParams.set('options',`-csearch_path=${schema},public`);process.env.DATABASE_URL=u.toString();
 }
 await check('migration and seed repeat without changing records',async()=>{
  await migrate(db);assert.equal((await migrate(db)).ran.length,0);await seed(db);await seed(db);
  assert.equal((await db.query('select count(*)::int as n from organisations'))[0].n,1);
  assert.equal((await db.query('select count(*)::int as n from evidence'))[0].n,3);
 });
 await check('all nine attention rules are exercised by the demo',async()=>{
  const compliance=await call('compliance');assert(compliance.find(x=>x.rule==='PRIVACY-REVIEW').source.includes('privacy.org.nz'));
  const rows=await call('attention');assert.equal(new Set(rows.map(x=>x.rule)).size,9);
  assert(rows.some(x=>x.rule==='PRIVACY-REVIEW'&&x.code==='EVID-OLD'));
 });
 await check('coverage is by standard, not duplicate evidence count',async()=>{
  let rows=await call('evidence-matrix');assert.equal(rows.find(x=>x.code==='REQ-TEACH-EVID').valid_evidence,0);
  assert.equal(rows.find(x=>x.code==='REQ-LAB-EVID').valid_evidence,1);
  assert.equal((await call('committee-agenda')).find(x=>x.code==='CYC-LAB').readiness,'ready for human decision');
  assert.equal((await call('committee-agenda')).find(x=>x.code==='CYC-NEW').readiness,'blocked');
 });
 for(const cmd of Object.keys(reads))await check('read '+cmd,async()=>assert(Array.isArray(await call(cmd))));
 await check('every entity lists, names resolve without case, ambiguity stops',async()=>{
  for(const kind of Object.keys(entities))assert((await call('list',{kind})).length>0);
  const [org]=await call('show',{kind:'organisations',ref:'kauri learning'});assert.equal(org.code,'ORG-KAURI');
  assert.equal((await resolve(db,'organisations',org.id.slice(0,8))).id,org.id);
  await bad(()=>call('show',{kind:'cycles',ref:'review'}),/Ambiguous.*CYC-LAB.*CYC-TEACH/);
  await bad(()=>call('list',{kind:'cycles;drop table cycles'}),/Choose/);
 });
 const decision=(code,cycle)=>({kind:'decisions',code,title:'Committee record',cycle_id:cycle,outcome:'approved',decision_on:today,committee:'Demo committee',minute_ref:'demo://minutes/'+code,rationale:'Verified by the committee',actor:'Nina Patel'});
 await check('approvals cannot bypass incomplete records through generic add or SQL',async()=>{
  await bad(()=>call('add',decision('DEC-BLOCKED','CYC-TEACH')),/Approval blocked/);
  await bad(()=>call('add',decision('DEC-EMPTY','CYC-NEW')),/Approval blocked/);
  const c=await resolve(db,'cycles','CYC-TEACH');
  await sqlBad("insert into decisions(code,title,cycle_id,outcome,decision_on,committee,minute_ref,rationale) values('DIRECT','Direct',$1,'approved',current_date,'Committee','demo://minutes','Test')",[c.id]);
  assert.equal((await db.query("select count(*)::int as n from decisions where code in ('DEC-BLOCKED','DEC-EMPTY','DIRECT')"))[0].n,0);
 });
 await check('human decision records its source and change history',async()=>{
  const [r]=await call('add',decision('DEC-LAB','CYC-LAB'));assert.equal(r.outcome,'approved');
  assert.equal((await call('cycle-review')).find(x=>x.code==='CYC-LAB').last_decision,'approved');
 });
 await check('committee members and recused reviewers do not satisfy the assessor gate',async()=>{
  await call('update',{kind:'assignments',ref:'ASG-LAB',role:'committee',actor:'Nina Patel'});
  await bad(()=>call('add',decision('DEC-COMMITTEE-ONLY','CYC-LAB')),/Approval blocked/);
  await call('update',{kind:'assignments',ref:'ASG-LAB',role:'lead',conflict_state:'recused',actor:'Nina Patel'});
  await bad(()=>call('add',decision('DEC-RECUSED','CYC-LAB')),/Approval blocked/);
  await bad(()=>call('add',{kind:'assignments',code:'ASG-DUP',cycle_id:'CYC-LAB',person:'nina patel',role:'reviewer',actor:'Nina Patel'}),/unique constraint/);
  await bad(()=>call('update',{kind:'assignments',ref:'ASG-LAB',person:' ',actor:'Nina Patel'}),/check constraint/);
  await call('update',{kind:'assignments',ref:'ASG-LAB',role:'lead',conflict_state:'clear',actor:'Nina Patel'});
 });
 await check('evidence review is dated and cannot review in the future',async()=>{
  await bad(()=>call('review-evidence',{ref:'EVID-NEW',reviewed_on:date(1),actor:'Nina Patel'}),/future/);
  await bad(()=>call('review-evidence',{ref:'EVID-NEW',reviewed_on:'2026-02-30',actor:'Nina Patel'}),/Invalid ISO date/);
  await call('review-evidence',{ref:'EVID-NEW',reviewed_on:today,actor:'Nina Patel'});
  assert.equal((await call('evidence-matrix')).find(x=>x.code==='REQ-TEACH-EVID').valid_evidence,1);
 });
 await check('corrective-action closure requires independent verification and evidence',async()=>{
  await bad(()=>call('close-finding',{ref:'FIND-TEACH',closed_on:today,resolution:'demo://fix',actor:'Mara Chen'}),/check constraint/);
  await bad(()=>call('close-finding',{ref:'FIND-TEACH',closed_on:today,actor:'Nina Patel'}),/resolution/);
  await call('close-finding',{ref:'FIND-TEACH',closed_on:today,resolution:'demo://fix',actor:'Nina Patel'});
  assert.equal((await call('corrective-actions'))[0].status,'closed');
  assert(!(await call('attention')).some(x=>x.rule==='FINDING-DUE'));
 });
 await check('resolve every remaining blocker before approval',async()=>{
  await call('add',{kind:'evidence',code:'EVID-FIX',title:'Improvement proof',requirement_id:'REQ-TEACH-IMPROVE',document_ref:'demo://fix',version:'1',reviewed_by:'Nina Patel',reviewed_on:today,actor:'Nina Patel'});
  await call('update',{kind:'assignments',ref:'ASG-TEACH',conflict_state:'clear',declared_on:today,actor:'Aroha West'});
  await bad(()=>call('add',decision('DEC-NOVISIT','CYC-TEACH')),/Approval blocked/);
  await bad(()=>call('update',{kind:'visits',ref:'VIS-TEACH',completed_on:today,actor:'Aroha West'}),/check constraint/);
  await call('update',{kind:'visits',ref:'VIS-TEACH',completed_on:today,report_ref:'demo://visit',actor:'Aroha West'});
  await call('update',{kind:'cycles',ref:'CYC-TEACH',due_on:date(20),renewal_on:date(120),actor:'Mara Chen'});
  await call('update',{kind:'evidence',ref:'EVID-OLD',retention_due:date(100),actor:'Mara Chen'});
  await call('update',{kind:'cycles',ref:'CYC-NEW',status:'withdrawn',actor:'Mara Chen'});
  await call('add',decision('DEC-TEACH-APPROVED','CYC-TEACH'));
  assert.equal((await call('attention')).length,0);
 });
 await check('unknown fields, invalid booleans and missing references fail',async()=>{
  await bad(()=>call('update',{kind:'cycles',ref:'CYC-TEACH',unexpected:'x',actor:'Mara'}),/Unknown/);
  await bad(()=>call('update',{kind:'evidence',ref:'EVID-OLD',personal_data:'sometimes',actor:'Mara'}),/Invalid boolean/);
  await bad(()=>call('add',{kind:'requirements',code:'BAD',title:'Bad',cycle_id:'absent',standard_id:'STD-EVID',owner:'Mara',actor:'Mara'}),/No cycles match/);
 });
 await check('notes and update history retain actor and before values',async()=>{
  await call('log',{kind:'cycles',ref:'CYC-TEACH',note:'Committee pack checked',actor:'Mara Chen'});
  const log=await call('activity');assert(log.some(x=>x.action==='update'&&x.details.before));assert(log.some(x=>x.action==='note'&&x.actor==='Mara Chen'));
 });
 const map=path.join(REPO_ROOT,'fixtures/armature-organisations-map.json');
 const file=path.join(REPO_ROOT,'fixtures/armature-organisations.csv');
 const imp={kind:'organisations',file,map,actor:'Importer'};
 await check('mapped import previews, preserves provenance and repeats safely',async()=>{
  assert.equal((await call('import',{...imp,dry_run:true},['armature-fabric']))[0].added,1);
  assert.equal((await db.query("select count(*)::int n from organisations where code='ORG-IMPORT'"))[0].n,0);
  assert.equal((await call('import',imp,['armature-fabric']))[0].added,1);
  assert.equal((await call('import',imp,['armature-fabric']))[0].unchanged,1);
  const source=(await call('activity')).find(x=>x.action==='import-source');assert.equal(source.details.row['Legacy note'],'Retain this unmapped note');assert.equal(source.details.vendor,'ARMATURE Fabric');
 });
 await check('conflicts, duplicate codes and mid-file errors roll back the entire import',async()=>{
  const f=path.join(tmp,'invalid.csv');
  fs.writeFileSync(f,'Organisation ID,Organisation name,Case manager,Country,Legacy note\nORG-ROLLBACK,New Org,Nina,NZ,note\nORG-IMPORT,Changed Org,Nina,NZ,note\n');
  await bad(()=>call('import',{...imp,file:f},['armature-fabric']),/Conflicting existing/);
  assert.equal((await db.query("select count(*)::int n from organisations where code='ORG-ROLLBACK'"))[0].n,0);
  fs.writeFileSync(f,'Organisation ID,Organisation name,Case manager,Country,Legacy note\nORG-DUP,New Org,Nina,NZ,note\norg-dup,New Org,Nina,NZ,note\n');
  await bad(()=>call('import',{...imp,file:f},['armature-fabric']),/Duplicate code/);
  assert.equal((await db.query("select count(*)::int n from organisations where lower(code)='org-dup'"))[0].n,0);
  await bad(()=>call('import',{...imp,dry_run:'false'},['armature-fabric']),/without a value/);
 });
 await check('CSV parser preserves multiline values and rejects broken headers',async()=>{
  assert.deepEqual(parseCsv('\ufeffA,B\r\n"a,b","x\n""y"""\r\n'),[{A:'a,b',B:'x\n"y"'}]);
  assert.throws(()=>parseCsv('a,A\nx,y'),/unique/);assert.throws(()=>parseCsv('a,b\nx'),/expected/);assert.throws(()=>parseCsv('a\n"bad'),/unclosed/);
 });
 await check('exports preserve full records and portable references',async()=>{
  const [r]=await call('export',{dir:tmp});const backup=JSON.parse(fs.readFileSync(r.file));assert.equal(backup.decisions.length,3);assert(backup.activity.length>0);
  for(const kind of Object.keys(entities)){
   const [out]=await call('export',{dir:tmp,kind});const rows=parseCsv(fs.readFileSync(out.file,'utf8'));assert(rows.length>0);
   if(kind==='requirements')assert(rows[0].cycle_id.startsWith('CYC-'));
  }
 });
 await check('weekly review, help and both draft documents run',async()=>{
  assert((await call('weekly-review')).committee.length>0);assert.equal((await call('help')).length,commands.length);
  for(const cmd of ['draft-committee-pack','draft-findings-letter']){
   const [r]=await call(cmd,{ref:'CYC-TEACH'});assert(r.file.startsWith(tmp));const h=fs.readFileSync(r.file,'utf8');assert(h.includes('DRAFT'));assert(h.includes('Nothing has been sent'));assert(!h.includes('CYC-LAB'));
  }
 });
 assert.deepEqual([...covered].sort(),[...commands].sort());
 await db.close();db=null;
 const child=(script,args=[])=>{const r=spawnSync(process.execPath,[path.join(REPO_ROOT,'scripts',script),...args],{env:process.env,encoding:'utf8',cwd:REPO_ROOT});assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;};
 await check('CLI JSON and error exits work across platforms',async()=>{
  assert(Array.isArray(JSON.parse(child('accreditation.mjs',['committee-agenda','--json']))));
  const r=spawnSync(process.execPath,[path.join(REPO_ROOT,'scripts/accreditation.mjs'),'show','--kind=cycles','--ref=review','--json'],{env:process.env,encoding:'utf8'});assert.equal(r.status,1);assert(r.stderr.includes('Ambiguous'));
 });
 await check('all branded documents and read-only views render',async()=>{
  child('view.mjs');child('docs.mjs');
  assert.equal(fs.readdirSync(path.join(tmp,'views')).length,3);
  assert.equal(fs.readdirSync(path.join(tmp,'docs-out','committee-pack')).length,3);
  const h=fs.readFileSync(path.join(tmp,'views','week.html'),'utf8');assert(h.includes('Kauri Accreditation'));assert(h.includes('Committee agenda'));assert(!/<form|<button|<script/.test(h));
 });
 console.log(`PASS: ${count} checks; all ${commands.length} CLI commands; migration, seed, imports, workflow gates, exports, documents and views.`);
}finally{
 if(!db&&process.env.TEST_DATABASE_URL)db=await getDb();
 if(db){if(process.env.TEST_DATABASE_URL)await db.exec(`drop schema ${schema} cascade`);await db.close();}
 fs.rmSync(tmp,{recursive:true,force:true});
}
