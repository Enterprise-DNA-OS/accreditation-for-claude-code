create function stamp_updated() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create table organisations (id uuid primary key default gen_random_uuid(), code text not null check (btrim(code)<>''), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), name text not null check(btrim(name)<>''), owner text not null check(btrim(owner)<>''), region text not null default 'NZ');
create unique index organisations_code on organisations(lower(code));
alter table organisations enable row level security;
revoke all on organisations from public;
create trigger organisations_stamp before update on organisations for each row execute function stamp_updated();
create table standards (id uuid primary key default gen_random_uuid(), code text not null check (btrim(code)<>''), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), title text not null, version text not null, source_url text not null check(source_url ~ '^https?://'));
create unique index standards_code on standards(lower(code));
alter table standards enable row level security;
revoke all on standards from public;
create trigger standards_stamp before update on standards for each row execute function stamp_updated();
create table cycles (id uuid primary key default gen_random_uuid(), code text not null check (btrim(code)<>''), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), title text not null, organisation_id uuid not null references organisations(id), owner text not null, due_on date not null, renewal_on date, status text not null default 'active' check(status in ('active','completed','withdrawn')));
create unique index cycles_code on cycles(lower(code));
alter table cycles enable row level security;
revoke all on cycles from public;
create trigger cycles_stamp before update on cycles for each row execute function stamp_updated();
create table requirements (id uuid primary key default gen_random_uuid(), code text not null check (btrim(code)<>''), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), title text not null, cycle_id uuid not null references cycles(id), standard_id uuid not null references standards(id), owner text not null, required boolean not null default true, unique(cycle_id,standard_id));
create unique index requirements_code on requirements(lower(code));
alter table requirements enable row level security;
revoke all on requirements from public;
create trigger requirements_stamp before update on requirements for each row execute function stamp_updated();
create table evidence (id uuid primary key default gen_random_uuid(), code text not null check (btrim(code)<>''), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), title text not null, requirement_id uuid not null references requirements(id), document_ref text not null check(btrim(document_ref)<>''), version text not null, reviewed_by text not null default '', reviewed_on date, expires_on date, personal_data boolean not null default false, retention_due date, check((reviewed_on is null and reviewed_by='') or (reviewed_on is not null and btrim(reviewed_by)<>'')), check(reviewed_on is null or reviewed_on<=current_date));
create unique index evidence_code on evidence(lower(code));
alter table evidence enable row level security;
revoke all on evidence from public;
create trigger evidence_stamp before update on evidence for each row execute function stamp_updated();
create table assignments (id uuid primary key default gen_random_uuid(), code text not null check (btrim(code)<>''), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), cycle_id uuid not null references cycles(id), person text not null, role text not null check(role in ('lead','reviewer','committee')), conflict_state text not null default 'unknown' check(conflict_state in ('unknown','clear','declared','recused')), declared_on date, check(conflict_state='unknown' or declared_on is not null), check(declared_on is null or declared_on<=current_date));
create unique index assignments_code on assignments(lower(code));
alter table assignments enable row level security;
revoke all on assignments from public;
create trigger assignments_stamp before update on assignments for each row execute function stamp_updated();
create table visits (id uuid primary key default gen_random_uuid(), code text not null check (btrim(code)<>''), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), title text not null, cycle_id uuid not null references cycles(id), lead text not null, planned_on date not null, completed_on date, report_ref text not null default '', check(completed_on is null or (btrim(report_ref)<>'' and completed_on<=current_date)));
create unique index visits_code on visits(lower(code));
alter table visits enable row level security;
revoke all on visits from public;
create trigger visits_stamp before update on visits for each row execute function stamp_updated();
create table findings (id uuid primary key default gen_random_uuid(), code text not null check (btrim(code)<>''), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), title text not null, requirement_id uuid not null references requirements(id), owner text not null, severity text not null check(severity in ('minor','major')), due_on date not null, status text not null default 'open' check(status in ('open','closed')), resolution text not null default '', verified_by text not null default '', closed_on date, check(status<>'closed' or (btrim(resolution)<>'' and btrim(verified_by)<>'' and lower(btrim(verified_by))<>lower(btrim(owner)) and closed_on is not null and closed_on<=current_date)));
create unique index findings_code on findings(lower(code));
alter table findings enable row level security;
revoke all on findings from public;
create trigger findings_stamp before update on findings for each row execute function stamp_updated();
create table decisions (id uuid primary key default gen_random_uuid(), code text not null check (btrim(code)<>''), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), title text not null, cycle_id uuid not null references cycles(id), outcome text not null check(outcome in ('approved','deferred','declined')), decision_on date not null check(decision_on<=current_date), committee text not null check(btrim(committee)<>''), minute_ref text not null check(btrim(minute_ref)<>''), rationale text not null check(btrim(rationale)<>''));
create unique index decisions_code on decisions(lower(code));
alter table decisions enable row level security;
revoke all on decisions from public;
create trigger decisions_stamp before update on decisions for each row execute function stamp_updated();
create index cycles_organisation_id on cycles(organisation_id);
create index requirements_cycle_id on requirements(cycle_id);
create index requirements_standard_id on requirements(standard_id);
create index evidence_requirement_id on evidence(requirement_id);
create index assignments_cycle_id on assignments(cycle_id);
create index visits_cycle_id on visits(cycle_id);
create index findings_requirement_id on findings(requirement_id);
create index decisions_cycle_id on decisions(cycle_id);

create table activity(id uuid primary key default gen_random_uuid(), kind text not null, record_id uuid not null, actor text not null check(btrim(actor)<>''), action text not null, details jsonb not null, created_at timestamptz not null default now());
alter table activity enable row level security;
revoke all on activity from public;
create view evidence_matrix as
 select r.id,r.code,r.title,c.code as cycle,c.id as cycle_id,s.code as standard,s.version,r.owner,r.required,
 (select count(*)::int from evidence e where e.requirement_id=r.id) as evidence_count,
 (select count(*)::int from evidence e where e.requirement_id=r.id and e.reviewed_on is not null and (e.expires_on is null or e.expires_on>=current_date)) as valid_evidence,
 (select count(*)::int from findings f where f.requirement_id=r.id and f.status='open') as open_findings
 from requirements r join cycles c on c.id=r.cycle_id join standards s on s.id=r.standard_id;
create view cycle_readiness as
 select c.id,c.code,c.title,o.name as organisation,c.owner,c.due_on,c.renewal_on,c.status,
 (select count(*)::int from requirements r where r.cycle_id=c.id and r.required) as required_count,
 (select count(*)::int from evidence_matrix m where m.cycle_id=c.id and m.required and m.valid_evidence=0) as evidence_gaps,
 (select count(*)::int from findings f join requirements r on r.id=f.requirement_id where r.cycle_id=c.id and f.status='open') as open_findings,
 (select count(*)::int from visits v where v.cycle_id=c.id and v.completed_on is not null) as completed_visits,
 (select count(*)::int from assignments a where a.cycle_id=c.id and a.conflict_state='clear') as clear_reviewers,
 (select count(*)::int from assignments a where a.cycle_id=c.id and a.conflict_state in ('unknown','declared')) as unresolved_conflicts,
 (select d.outcome from decisions d where d.cycle_id=c.id order by d.decision_on desc,d.created_at desc,d.code desc limit 1) as last_decision
 from cycles c join organisations o on o.id=c.organisation_id;
create view accreditation_attention as
 select 'EVIDENCE-GAP'::text as rule,m.code,m.owner,c.due_on,'Required standard lacks current reviewed evidence'::text as finding from evidence_matrix m join cycles c on c.id=m.cycle_id where c.status='active' and m.required and m.valid_evidence=0
 union all select 'FINDING-DUE',f.code,f.owner,f.due_on,'Corrective action is overdue' from findings f join requirements r on r.id=f.requirement_id join cycles c on c.id=r.cycle_id where c.status='active' and f.status='open' and f.due_on<current_date
 union all select 'CYCLE-DUE',c.code,c.owner,c.due_on,'Accreditation cycle is overdue' from cycles c where c.status='active' and c.due_on<current_date
 union all select 'VISIT-DUE',v.code,v.lead,v.planned_on,'Site visit has no completed report' from visits v join cycles c on c.id=v.cycle_id where c.status='active' and v.completed_on is null and v.planned_on<current_date
 union all select 'REVIEWER-CONFLICT',a.code,a.person,a.declared_on,'Reviewer declaration is missing or unresolved' from assignments a join cycles c on c.id=a.cycle_id where c.status='active' and a.conflict_state in ('unknown','declared')
 union all select 'PRIVACY-REVIEW',e.code,r.owner,e.retention_due,'Review the purpose for retaining personal information' from evidence e join requirements r on r.id=e.requirement_id where e.personal_data and (e.retention_due is null or e.retention_due<current_date)
 union all select 'RENEWAL-DUE',c.code,c.owner,c.renewal_on,'Renewal falls within 60 days or is overdue' from cycles c where c.status<>'withdrawn' and c.renewal_on<=current_date+60
 union all select 'REVIEWER-MISSING',c.code,c.owner,c.due_on,'No reviewer with a clear conflict declaration' from cycle_readiness c where c.status='active' and c.clear_reviewers=0
 union all select 'STANDARD-MISSING',c.code,c.owner,c.due_on,'No required standards assigned' from cycle_readiness c where c.status='active' and c.required_count=0;
create function guard_decision() returns trigger language plpgsql as $$
declare r record;
begin
 if new.outcome='approved' then
  select * into r from cycle_readiness where id=new.cycle_id;
  if r.status<>'active' or r.required_count=0 or r.evidence_gaps>0 or r.open_findings>0 or r.completed_visits=0 or r.clear_reviewers=0 or r.unresolved_conflicts>0 then
   raise exception 'Approval blocked: required evidence, findings, visit or reviewer declaration incomplete';
  end if;
 end if;
 return new;
end $$;
create trigger decision_guard before insert or update on decisions for each row execute function guard_decision();
revoke all on evidence_matrix,cycle_readiness,accreditation_attention from public;
