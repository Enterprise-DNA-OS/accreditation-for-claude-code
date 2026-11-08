# Accreditation for Claude Code

Your accreditation cycles, standards, evidence, site visits, corrective actions and committee decisions in a database you own.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free, MIT. Install and try the demo. | Your standards, records, documents and ARMATURE export mapped to your version. | Installed and operated through Omni by Enterprise DNA. A setup fee, then a retainer. |

[Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=armature-fabric) · [Instead of ARMATURE Fabric](https://enterprisedna.co/omni/instead-of/armature-fabric)

## What it does

Run the internal accreditation office from current records. Prepare the committee agenda, find missing evidence, check reviewer declarations, plan visits, close corrective actions with independent verification and prepare renewal briefs. Claude Code, Codex, OpenCode or Cursor runs the same commands. Humans review the documents and make the decisions.

ARMATURE Fabric is a broader platform with stakeholder portals and configurable workflows. This free base is an internal operating system, not a claim of full platform parity. Enterprise DNA scopes the applicant portal, document connections, access controls or other interfaces you need when building your version. [Source and selection notes](docs/research.md).

## Quick start

Node 20 or later. No paid model API or cloud account is needed for the demo.

```bash
git clone https://github.com/Enterprise-DNA-OS/accreditation-for-claude-code.git
cd accreditation-for-claude-code
npm install
npm run demo
npm run accreditation -- weekly-review
npm run view
npm run docs
```

PGlite stores local data in .data/db. DATA_DIR overrides that directory. DATABASE_URL selects PostgreSQL. Run npm run migrate before using a fresh database. Never seed production records. Shared installations need deliberate access roles, encrypted transport and backups. Public roles receive no default access.

The fictional Kauri Learning Institute has an overdue teaching review, expired evidence, an unreviewed replacement, a late visit, an overdue major finding, a missing conflict declaration and a near renewal. A second cycle is ready for a human decision. A third has no standards or reviewer and is blocked. Demo dates are relative to today. Repeated seeding preserves existing records. Demo standards are fictional.

## The weekly rituals

Monday: /weekly-review combines attention, cycles, committee readiness and renewals. Before site visits: /visits-due and /reviewer-check. Before the committee: /evidence-matrix, /corrective-actions and /draft-committee-pack. After evidence arrives: /review-evidence. After independent verification: /close-finding. At renewal: /renewals-due and /docs.

## Ten questions answered today

These are verified queries in this build, not unsupported claims that ARMATURE cannot answer them.

1. Which cycles have current evidence but unresolved reviewer conflicts? /cycle-review
2. Which required standards have no reviewed evidence? /evidence-matrix
3. Which evidence has expired while a newer version waits for review? /evidence-review
4. Which site visits passed their planned date without a report? /visits-due
5. Which major corrective actions are overdue and who owns them? /corrective-actions
6. Which review teams have not declared their conflicts? /reviewer-check
7. Which renewals approach while the last decision was deferred? /renewals-due
8. Which cases can go to the committee and which are blocked? /committee-agenda
9. Whose active cycles are most overdue? /owner-load
10. Which minutes and rationale support each recorded decision? /decision-history

## Commands and records

26 CLI commands and 30 slash command recipes. Every CLI command accepts --json. The nine record types and every allowed field are in entities.json. Dates use YYYY-MM-DD. Identifiers resolve by code, case-insensitive name or partial UUID. Ambiguous names list candidates and fail.

```bash
npm run accreditation -- show --kind=cycles --ref=CYC-TEACH --json
npm run accreditation -- log --kind=cycles --ref=CYC-TEACH --note="Evidence review booked" --actor="Mara Chen"
npm run accreditation -- review-evidence --ref=EVID-NEW --reviewed-on=2026-11-08 --actor="Nina Patel"
```

Use the actual review date for your work. /add and /update cover organisations, standards, cycles, requirements, evidence, assignments, visits, findings and decisions. A committee decision needs a source minute and rationale. Approval is blocked until required evidence, visits, findings and declarations pass. Evidence references point to documents you retain separately; the package does not store or inspect attachments. The activity history records actors, changes and original import rows, but is not tamper-proof.

## Bring your history

ARMATURE's documented export is in its current native format, not a guaranteed CSV schema. Obtain it before ending the subscription, convert and map it, then import each prepared file with one command. The fixture is synthetic. Do not treat it as vendor headers.

```bash
npm run accreditation -- import armature-fabric --kind=organisations --file=fixtures/armature-organisations.csv --map=fixtures/armature-organisations-map.json --actor="Your name" --dry-run
npm run accreditation -- import armature-fabric --kind=organisations --file=fixtures/armature-organisations.csv --map=fixtures/armature-organisations-map.json --actor="Your name"
npm run accreditation -- export --dir=exports
```

Each file is transactional. Identical repeats are unchanged. Conflicts and invalid references stop with no partial file import. Original imported rows and unmapped columns are retained in activity. Export each entity as CSV or the full record set and history as JSON. [Mapping, import order, exclusions and reconciliation](docs/replace-armature-fabric.md).

## Documents and views

Change brand.json once for your business name, colours and logo. npm run docs renders committee packs, corrective-action schedules and renewal briefs as printable HTML. npm run view renders the week, evidence coverage and renewals as read-only HTML snapshots. Draft commands write only to drafts. No messages are sent. Reports are internal documents and do not issue accreditation certificates.

## Record checks

Nine sourced or explicitly internal checks flag missing standards, stale evidence, overdue cycles, visits, findings, unresolved conflicts, missing reviewers, approaching renewals and personal-information retention review. [Scope and sources](docs/compliance.md). A passing check does not certify legal or accreditation compliance. Rules are configurable, and your licensed standards are not bundled.

## Your first hour: ten things to ask for

1. Put our name and logo on the committee pack.
2. Preview one converted export before saving it.
3. Add our programme categories to cycles.
4. Add our standards and their version references.
5. Change the renewal planning window.
6. Show evidence gaps grouped by owner.
7. Add a second verification field to major findings.
8. Include our appeal reference on decisions.
9. Produce a visit schedule for next month.
10. Draft a corrective-action letter for one programme.

/customise writes and applies a new migration, updates the commands and tests the change. /new-view adds a read-only report. [Why no front end](docs/why-no-front-end.md).

## Verification

npm test uses a temporary database, migrates, seeds twice, exercises every command, raises and clears all nine finding rules, verifies approval and closure gates, tests date validation, CSV parsing, rollback, repeated imports, provenance, exports, ambiguity, draft scope and branded rendering. TEST_DATABASE_URL selects a disposable PostgreSQL database with an isolated test schema. Manual CI defines Linux, Windows and PostgreSQL checks. A local Linux pass does not establish a Windows pass.

MIT. Copyright 2026 Enterprise DNA. Not affiliated with ARMATURE or Anthropic. Hosting and agent use have their own costs. [Book 30 minutes with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=armature-fabric).
