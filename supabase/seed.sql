do $$
declare org uuid; s1 uuid; s2 uuid; c1 uuid; c2 uuid; c3 uuid; r1 uuid; r2 uuid; r3 uuid;
begin
 if exists(select 1 from organisations where code='ORG-KAURI') then return; end if;
 insert into organisations(code,name,owner,region) values('ORG-KAURI','Kauri Learning Institute','Mara Chen','NZ') returning id into org;
 insert into standards(code,title,version,source_url) values('STD-EVID','Programme evidence review','Demo 1','https://armaturecorp.com/armature-fabric/') returning id into s1;
 insert into standards(code,title,version,source_url) values('STD-IMPROVE','Improvement follow-through','Demo 1','https://armaturecorp.com/armature-fabric/') returning id into s2;
 insert into cycles(code,title,organisation_id,owner,due_on,renewal_on) values('CYC-TEACH','Teaching programme review',org,'Mara Chen',current_date-5,current_date+40) returning id into c1;
 insert into cycles(code,title,organisation_id,owner,due_on,renewal_on) values('CYC-LAB','Laboratory training review',org,'Leo Singh',current_date+30,current_date+365) returning id into c2;
 insert into cycles(code,title,organisation_id,owner,due_on) values('CYC-NEW','New programme intake',org,'Mara Chen',current_date+90) returning id into c3;
 insert into requirements(code,title,cycle_id,standard_id,owner) values('REQ-TEACH-EVID','Teaching evidence',c1,s1,'Mara Chen') returning id into r1;
 insert into requirements(code,title,cycle_id,standard_id,owner) values('REQ-TEACH-IMPROVE','Teaching improvements',c1,s2,'Mara Chen') returning id into r2;
 insert into requirements(code,title,cycle_id,standard_id,owner) values('REQ-LAB-EVID','Laboratory evidence',c2,s1,'Leo Singh') returning id into r3;
 insert into evidence(code,title,requirement_id,document_ref,version,reviewed_by,reviewed_on,expires_on,personal_data,retention_due) values
 ('EVID-OLD','Previous self-study',r1,'demo://self-study-old','1','Aroha West',current_date-365,current_date-2,true,current_date-10),
 ('EVID-NEW','Revised self-study awaiting review',r1,'demo://self-study-new','2','',null,current_date+365,false,null),
 ('EVID-LAB','Laboratory evidence pack',r3,'demo://lab-pack','1','Aroha West',current_date-2,current_date+300,false,null);
 insert into assignments(code,cycle_id,person,role,conflict_state,declared_on) values
 ('ASG-TEACH',c1,'Aroha West','lead','unknown',null),('ASG-LAB',c2,'Nina Patel','lead','clear',current_date-20);
 insert into visits(code,title,cycle_id,lead,planned_on,completed_on,report_ref) values
 ('VIS-TEACH','Teaching site visit',c1,'Aroha West',current_date-3,null,''),('VIS-LAB','Laboratory site visit',c2,'Nina Patel',current_date-4,current_date-4,'demo://lab-visit');
 insert into findings(code,title,requirement_id,owner,severity,due_on) values('FIND-TEACH','Missing improvement evidence',r2,'Mara Chen','major',current_date-7);
 insert into decisions(code,title,cycle_id,outcome,decision_on,committee,minute_ref,rationale) values('DEC-TEACH','Teaching deferral',c1,'deferred',current_date-1,'Demo review committee','demo://minutes','Awaiting current reviewed evidence and corrective action');
end $$;
