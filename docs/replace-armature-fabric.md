# Replace ARMATURE Fabric operations

## Obtain and inspect the export first

Checked 8 November 2026. [ARMATURE's published terms](https://armaturecorp.com/tos/) describe a one-time native-format export when requested in writing at least ten business days before termination or expiry. They do not promise a universal CSV layout or compatibility with another product. Confirm the terms in your own contract and obtain the export before changing the subscription. This package does not send the request.

The native export is not consumed directly. Convert the records to UTF-8 CSV, retaining identifiers and relationships. Obtain an attachment inventory and preserve the documents separately. A printable review report is not a complete data export. The [vendor's release note](https://armaturecorp.com/our-biggest-update-yet-what-the-q2-2025-release-means-for-armature-fabric-users/) describes printable review exports, not a canonical migration format.

## One command per mapped CSV

The included fixtures are invented examples, not captured vendor headers. An operator or Enterprise DNA must prepare and check the mapping for the actual export. Map local fields to the exact source column headings.

```bash
npm run accreditation -- import armature-fabric --kind=organisations --file=fixtures/armature-organisations.csv --map=fixtures/armature-organisations-map.json --actor="Your name" --dry-run
npm run accreditation -- import armature-fabric --kind=organisations --file=fixtures/armature-organisations.csv --map=fixtures/armature-organisations-map.json --actor="Your name"
```

Once converted and mapped, one command imports each file. Dates must be YYYY-MM-DD; booleans accept true/false, yes/no or 1/0. Supply stable unique codes. Reference related records by those codes. Every mapped row must include the required fields in entities.json. There are no inferred approvals, owners, standards or relationships.

| Order | Kind | Main mapping |
|---|---|---|
| 1 | organisations | Stable identifier, name, owner, region |
| 2 | standards | Identifier, title, version, authoritative source URL |
| 3 | cycles | Organisation code, cycle owner, due date, renewal date, status |
| 4 | requirements | Cycle code, standard code, owner, required flag |
| 5 | evidence | Requirement code, document reference, version, review and expiry dates, retention review |
| 6 | assignments | Cycle code, reviewer name, role, conflict declaration and date |
| 7 | visits | Cycle code, lead, planned and completed dates, report reference |
| 8 | findings | Requirement code, severity, owner, deadline, closure evidence and verifier |
| 9 | decisions | Cycle code, outcome, date, committee, minutes and rationale |

An identical repeat is unchanged. A conflicting existing record, duplicate code, missing reference, invalid date or failed decision gate stops and rolls back that whole file. Earlier successfully imported files remain. The original row and its mapping, including unmapped values, are stored in activity for newly imported records. Review reports and sensitive values stay out of source control. A rerun of an unchanged row does not add a second provenance entry.

## Reconcile before switching

Export each entity back to CSV and compare counts and identifiers, then check cycle evidence gaps, open findings, visit reports, reviewer declarations and decision minutes. Check all document references against the retained originals. Run a sample committee review in both systems.

This import does not bring across native forms, portals, authentication, attachments themselves, workflow definitions, messages, vendor audit logs or permissions. Keep these in a separate verified archive. Approved historical decisions that do not meet today's record gates require a reviewed historical migration; do not invent current evidence to force them through. The JSON export is a full data snapshot for inspection, not an automatic database restore format.

The free version has no per-seat software charge. Hosting, agent use, access control and migration work have their own costs. Switch-in-a-day means a small, already mapped dataset can be loaded and checked in a day. Export lead time, conversion and archive reconciliation are separate work. Enterprise DNA handles that work when building your version.
