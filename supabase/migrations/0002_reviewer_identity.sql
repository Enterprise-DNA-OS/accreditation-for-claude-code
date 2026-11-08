create or replace view cycle_readiness as
 select c.id,c.code,c.title,o.name as organisation,c.owner,c.due_on,c.renewal_on,c.status,
 (select count(*)::int from requirements r where r.cycle_id=c.id and r.required) as required_count,
 (select count(*)::int from evidence_matrix m where m.cycle_id=c.id and m.required and m.valid_evidence=0) as evidence_gaps,
 (select count(*)::int from findings f join requirements r on r.id=f.requirement_id where r.cycle_id=c.id and f.status='open') as open_findings,
 (select count(*)::int from visits v where v.cycle_id=c.id and v.completed_on is not null) as completed_visits,
 (select count(*)::int from assignments a where a.cycle_id=c.id and a.conflict_state='clear' and a.role in ('lead','reviewer')) as clear_reviewers,
 (select count(*)::int from assignments a where a.cycle_id=c.id and a.conflict_state in ('unknown','declared')) as unresolved_conflicts,
 (select d.outcome from decisions d where d.cycle_id=c.id order by d.decision_on desc,d.created_at desc,d.code desc limit 1) as last_decision
 from cycles c join organisations o on o.id=c.organisation_id;
alter table standards add constraint standards_title_not_blank check(btrim(title)<>'');
alter table standards add constraint standards_version_not_blank check(btrim(version)<>'');
alter table cycles add constraint cycles_title_not_blank check(btrim(title)<>'');
alter table cycles add constraint cycles_owner_not_blank check(btrim(owner)<>'');
alter table requirements add constraint requirements_title_not_blank check(btrim(title)<>'');
alter table requirements add constraint requirements_owner_not_blank check(btrim(owner)<>'');
alter table evidence add constraint evidence_title_not_blank check(btrim(title)<>'');
alter table evidence add constraint evidence_version_not_blank check(btrim(version)<>'');
alter table assignments add constraint assignments_person_not_blank check(btrim(person)<>'');
alter table visits add constraint visits_title_not_blank check(btrim(title)<>'');
alter table visits add constraint visits_lead_not_blank check(btrim(lead)<>'');
alter table findings add constraint findings_title_not_blank check(btrim(title)<>'');
alter table findings add constraint findings_owner_not_blank check(btrim(owner)<>'');
create unique index assignment_person_cycle on assignments(cycle_id,lower(btrim(person)));
