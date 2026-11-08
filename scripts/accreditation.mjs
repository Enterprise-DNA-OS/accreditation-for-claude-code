#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv} from './lib/csv.mjs';
import {table} from './lib/format.mjs';
import {page,table as htmlTable,writeOut} from './lib/render.mjs';

// Static identifiers only. User values are always bound parameters.
export const entities=JSON.parse(fs.readFileSync(path.join(REPO_ROOT,'entities.json'),'utf8'));
export const rules={
  "EVIDENCE-GAP": [
    "Internal accreditation policy",
    "Required standard needs at least one current reviewed evidence reference",
    "docs/compliance.md"
  ],
  "FINDING-DUE": [
    "Internal accreditation policy",
    "An open corrective action has passed its agreed due date",
    "docs/compliance.md"
  ],
  "CYCLE-DUE": [
    "Internal accreditation policy",
    "An active cycle has passed its agreed due date",
    "docs/compliance.md"
  ],
  "VISIT-DUE": [
    "Internal accreditation policy",
    "A planned visit is overdue without a completed report",
    "docs/compliance.md"
  ],
  "REVIEWER-CONFLICT": [
    "Internal accreditation policy",
    "A reviewer has an unknown or declared conflict",
    "docs/compliance.md"
  ],
  "RENEWAL-DUE": [
    "Internal accreditation policy",
    "Renewal falls within the chosen 60 day planning window or is overdue",
    "docs/compliance.md"
  ],
  "REVIEWER-MISSING": [
    "Internal accreditation policy",
    "At least one reviewer needs a clear conflict declaration",
    "docs/compliance.md"
  ],
  "STANDARD-MISSING": [
    "Internal accreditation policy",
    "At least one required standard must be assigned",
    "docs/compliance.md"
  ],
  "PRIVACY-REVIEW": [
    "NZ Privacy Act 2020, IPP9 plus internal review schedule",
    "Review retention purpose, not automatic deletion",
    "https://www.privacy.org.nz/privacy-principles/9/"
  ]
};
export const reads={
  "attention": "select rule,code,owner,due_on,finding from accreditation_attention order by rule,code",
  "cycle-review": "select code,organisation,owner,due_on,required_count,evidence_gaps,open_findings,completed_visits,clear_reviewers,unresolved_conflicts,last_decision from cycle_readiness order by due_on,code",
  "evidence-matrix": "select code,cycle,standard,version,owner,required,evidence_count,valid_evidence,open_findings from evidence_matrix order by cycle,code",
  "evidence-review": "select e.code,e.title,r.code as requirement,e.version,e.reviewed_by,e.reviewed_on,e.expires_on,case when e.reviewed_on is null then 'unreviewed' when e.expires_on<current_date then 'expired' else 'current' end as state from evidence e join requirements r on r.id=e.requirement_id order by e.code",
  "visits-due": "select v.code,c.code as cycle,v.lead,v.planned_on,v.completed_on,v.report_ref from visits v join cycles c on c.id=v.cycle_id where c.status='active' and v.completed_on is null order by v.planned_on,v.code",
  "corrective-actions": "select f.code,r.code as requirement,f.owner,f.severity,f.due_on,f.status,f.verified_by from findings f join requirements r on r.id=f.requirement_id order by f.due_on,f.code",
  "reviewer-check": "select a.code,c.code as cycle,a.person,a.role,a.conflict_state,a.declared_on from assignments a join cycles c on c.id=a.cycle_id order by c.code,a.code",
  "renewals-due": "select code,organisation,owner,renewal_on,last_decision from cycle_readiness where status<>'withdrawn' and renewal_on<=current_date+60 order by renewal_on,code",
  "committee-agenda": "select code,organisation,due_on,evidence_gaps,open_findings,case when required_count>0 and evidence_gaps=0 and open_findings=0 and completed_visits>0 and clear_reviewers>0 and unresolved_conflicts=0 then 'ready for human decision' else 'blocked' end as readiness from cycle_readiness where status='active' order by due_on,code",
  "owner-load": "select owner,count(*) as active_cycles,count(*) filter(where due_on<current_date) as overdue from cycles where status='active' group by owner order by overdue desc,owner",
  "decision-history": "select d.code,c.code as cycle,d.outcome,d.decision_on,d.committee,d.minute_ref,d.rationale from decisions d join cycles c on c.id=d.cycle_id order by d.decision_on desc,d.code",
  "activity": "select kind,actor,action,details,created_at from activity order by created_at desc,id"
};
function need(o,k){if(o[k]===undefined||o[k]===null||String(o[k]).trim()==='')throw Error(`Give --${k.replaceAll('_','-')}`);return o[k];}
function entity(kind){if(!entities[kind])throw Error(`Choose --kind=${Object.keys(entities).join('|')}`);return entities[kind];}
export async function resolve(db,kind,value){
 entity(kind);const names=entities[kind].fields.filter(f=>['name','title','person'].includes(f));
 const exact=await db.query(`select * from ${kind} where lower(code)=lower($1) or id::text=$1`,[String(value)]);
 if(exact.length===1)return exact[0];
 const rows=await db.query(`select * from ${kind} where left(id::text,length($1))=lower($1) or position(lower($1) in lower(code))>0 ${names.map(n=>`or position(lower($1) in lower(${n}))>0`).join(' ')} order by code`,[String(value)]);
 if(rows.length!==1)throw Error(rows.length?`Ambiguous ${kind}: ${rows.map(r=>`${r.code} (${r.id})`).join(', ')}`:`No ${kind} match: ${value}`);
 return rows[0];
}
async function fields(db,kind,input,partial=false){
 const spec=entity(kind),out={};
 for(const [key,val] of Object.entries(input)){
  if(!spec.fields.includes(key))throw Error(`Unknown ${kind} field ${key}`);
  let v=val;
  if(['personal_data','required'].includes(key)){if(!['true','false','yes','no','1','0'].includes(String(v).toLowerCase()))throw Error(`Invalid boolean ${key}`);v=['true','yes','1'].includes(String(v).toLowerCase());}
  if(key.endsWith('_on')||key.endsWith('_due')){
   if(v==='')v=null;
   if(v!==null&&(!/^\d{4}-\d{2}-\d{2}$/.test(String(v))||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v))throw Error(`Invalid ISO date ${key}: ${v}`);
  }
  if(['completed_on','reviewed_on','declared_on','decision_on','closed_on'].includes(key)&&v&&v>new Date().toISOString().slice(0,10))throw Error(`${key} cannot be in the future`);
  if(spec.refs?.[key])v=v? (await resolve(db,spec.refs[key],v)).id:null;
  if(key==='code'){v=String(v).trim();if(!v)throw Error('Empty code');}
  out[key]=v;
 }
 if(!partial)for(const k of spec.required)need(out,k);
 return out;
}
async function record(db,kind,id,actor,action,details){await db.query('insert into activity(kind,record_id,actor,action,details) values($1,$2,$3,$4,$5::jsonb)',[kind,id,actor,action,JSON.stringify(details)]);}
async function transaction(db,fn,dry=false){await db.exec('begin isolation level serializable');try{const out=await fn();await db.exec(dry?'rollback':'commit');return out;}catch(e){await db.exec('rollback');throw e;}}
async function insert(db,kind,data,actor){const cols=Object.keys(data);const [r]=await db.query(`insert into ${kind} (${cols.join(',')}) values(${cols.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(data));await record(db,kind,r.id,actor,'add',data);return r;}
async function update(db,kind,ref,changes,actor){const before=await resolve(db,kind,ref);const data=await fields(db,kind,changes,true);const cols=Object.keys(data);if(!cols.length)throw Error('No changed fields');const [r]=await db.query(`update ${kind} set ${cols.map((k,i)=>`${k}=$${i+1}`).join(',')} where id=$${cols.length+1} returning *`,[...Object.values(data),before.id]);await record(db,kind,r.id,actor,'update',{before,changes:data});return r;}
function csv(rows,cols){const esc=v=>'"'+String(v??'').replaceAll('"','""')+'"';return [cols.map(esc).join(','),...rows.map(r=>cols.map(k=>esc(r[k])).join(','))].join('\r\n')+'\r\n';}
export const commands=[...Object.keys(reads),'help','list','show','compliance','weekly-review','add','update','log','review-evidence','close-finding','import','export','draft-committee-pack','draft-findings-letter'];
export async function run(db,command,opts={},args=[]){
 if('dry_run' in opts && opts.dry_run!==true)throw Error('Use --dry-run without a value');
 if(reads[command])return db.query(reads[command]);
 if(command==='help')return commands.map(command=>({command}));
 if(command==='list'){entity(opts.kind);return db.query(`select * from ${opts.kind} order by code`);}
 if(command==='show')return [await resolve(db,opts.kind,need(opts,'ref'))];
 if(command==='compliance')return (await db.query(reads.attention)).map(r=>({...r,basis:rules[r.rule][0],check:rules[r.rule][1],source:rules[r.rule][2]||'docs/compliance.md (house policy)'}));
 if(command==='weekly-review')return {attention:await run(db,'attention'),cycles:await run(db,'cycle-review'),committee:await run(db,'committee-agenda'),renewals:await run(db,'renewals-due')};
 if(command==='add'||command==='update'){
  const actor=need(opts,'actor'),kind=need(opts,'kind');entity(kind);
  const input=Object.fromEntries(Object.entries(opts).filter(([k])=>!['actor','kind','ref','json'].includes(k)));
  return transaction(db,async()=>command==='add'?[await insert(db,kind,await fields(db,kind,input),actor)]:[await update(db,kind,need(opts,'ref'),input,actor)]);
 }
 if(command==='review-evidence'){
  const actor=need(opts,'actor');return transaction(db,async()=>[await update(db,'evidence',need(opts,'ref'),{reviewed_by:actor,reviewed_on:need(opts,'reviewed_on')},actor)]);
 }
 if(command==='close-finding'){
  const actor=need(opts,'actor');return transaction(db,async()=>[await update(db,'findings',need(opts,'ref'),{status:'closed',closed_on:need(opts,'closed_on'),resolution:need(opts,'resolution'),verified_by:actor},actor)]);
 }
 if(command==='log'){
  const actor=need(opts,'actor'),kind=need(opts,'kind'),r=await resolve(db,kind,need(opts,'ref'));need(opts,'note');
  await record(db,kind,r.id,actor,'note',{note:opts.note});return [{code:r.code,logged:true}];
 }
 if(command==='import'){
  const vendor = {'armature-fabric':'ARMATURE Fabric'}[args[0]];
  if(!vendor)throw Error('Use import armature-fabric --kind=... --file=... --map=... --actor=... [--dry-run]');
  const kind=need(opts,'kind'),spec=entity(kind),actor=need(opts,'actor');
  const mapping=JSON.parse(fs.readFileSync(need(opts,'map'),'utf8'));
  if(!mapping||Array.isArray(mapping)||typeof mapping!=='object')throw Error('Map must be an object of local field to source header');
  for(const [k,v] of Object.entries(mapping)){if(!spec.fields.includes(k)||typeof v!=='string'||!v.trim())throw Error(`Invalid mapping ${k}`);}
  for(const k of spec.required)if(!mapping[k])throw Error(`Map requires ${k}`);
  const rows=parseCsv(fs.readFileSync(need(opts,'file'),'utf8'));if(!rows.length)throw Error('CSV contains no records');
  const headers=Object.keys(rows[0]);for(const h of Object.values(mapping))if(!headers.includes(h))throw Error(`Missing CSV header: ${h}`);
  return transaction(db,async()=>{
   let added=0,unchanged=0;const seen=new Set();
   for(const row of rows){
    const raw=Object.fromEntries(Object.entries(mapping).map(([k,h])=>[k,row[h]]));const data=await fields(db,kind,raw);
    if(seen.has(data.code.toLowerCase()))throw Error(`Duplicate code in file: ${data.code}`);seen.add(data.code.toLowerCase());
    const existing=await db.query(`select * from ${kind} where lower(code)=lower($1)`,[data.code]);
    if(existing.length){if(existing.length>1||Object.entries(data).some(([k,v])=>String(existing[0][k]??'')!==String(v??'')))throw Error(`Conflicting existing record ${data.code}; review before updating`);unchanged++;continue;}
    const r=await insert(db,kind,data,actor);await record(db,kind,r.id,actor,'import-source',{vendor,source_file:path.basename(opts.file),row,mapping});added++;
   }
   return [{kind,rows:rows.length,added,unchanged,dry_run:Boolean(opts.dry_run),unmapped_headers:headers.filter(h=>!Object.values(mapping).includes(h)).join(', ')}];
  },Boolean(opts.dry_run));
 }
 if(command==='export'){
  const dir=path.resolve(opts.dir||path.join(REPO_ROOT,'exports'));fs.mkdirSync(dir,{recursive:true,mode:0o700});
  if(opts.kind){const spec=entity(opts.kind),rows=await db.query(`select * from ${opts.kind} order by code`);
   for(const r of rows)for(const [k,target] of Object.entries(spec.refs||{}))if(r[k])r[k]=(await resolve(db,target,r[k])).code;
   const file=path.join(dir,opts.kind+'.csv');fs.writeFileSync(file,csv(rows,spec.fields),{mode:0o600});return [{file,rows:rows.length}];
  }
  const out={exported_at:new Date().toISOString(),version:1};for(const kind of [...Object.keys(entities),'activity'])out[kind]=await db.query(`select * from ${kind} order by id`);
  const file=path.join(dir,'accreditation-backup.json');fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n',{mode:0o600});return [{file,records:Object.keys(entities).reduce((n,k)=>n+out[k].length,0)}];
 }
 if(command==='draft-committee-pack'||command==='draft-findings-letter'){
  const r=await resolve(db,'cycles',need(opts,'ref'));
  const summary=await db.query('select * from cycle_readiness where id=$1',[r.id]);
  const evidence=await db.query('select code,standard,version,owner,valid_evidence,open_findings from evidence_matrix where cycle_id=$1 order by code',[r.id]);
  const findings=await db.query('select f.code,f.title,f.owner,f.severity,f.due_on,f.status,f.resolution from findings f join requirements r on r.id=f.requirement_id where r.cycle_id=$1 order by f.code',[r.id]);
  const assignments=await db.query('select person,role,conflict_state,declared_on from assignments where cycle_id=$1 order by code',[r.id]);
  const sections=[{title:'Draft for review',note:'Internal operations record. Verify sources and recipients. This document does not grant accreditation. Nothing has been sent.',html:''},{title:'Cycle',html:htmlTable(summary)},...(command==='draft-committee-pack'?[{title:'Evidence',html:htmlTable(evidence)},{title:'Review team',html:htmlTable(assignments)}]:[]),{title:'Corrective actions',html:htmlTable(findings)}];
  const file=writeOut('drafts',`${command}-${r.code.replace(/[^a-zA-Z0-9-]/g,'_')}-${r.id}`,page({title:command==='draft-committee-pack'?'Committee pack: DRAFT':'Corrective action letter: DRAFT',subtitle:r.title,sections}));return [{file,status:'draft only'}];
 }
 throw Error(`Unknown command ${command}. Run help.`);
}
export function print(value){
 if(Array.isArray(value))return value.length?table(value,Object.keys(value[0]).map(key=>({key,label:key,width:80}))):'  (none)';
 return Object.entries(value).map(([k,v])=>`${k}\n${print(v)}`).join('\n\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [command='help',...rest]=process.argv.slice(2),opts={},args=[];
 for(const a of rest){if(a.startsWith('--')){const at=a.indexOf('=');const key=a.slice(2,at<0?undefined:at).replaceAll('-','_');if(key in opts)throw Error('Duplicate flag '+key);opts[key]=at<0?true:a.slice(at+1);}else args.push(a);}
 let db;try{db=await getDb();const out=await run(db,command,opts,args);console.log(opts.json?JSON.stringify(out):print(out));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}
}
