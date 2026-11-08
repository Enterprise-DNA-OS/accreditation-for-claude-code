# Accreditation for Claude Code

This is an internal accreditation office's record system. Use the database to prepare evidence reviews, site visits, corrective-action schedules and committee papers. The free base is not a self-service applicant portal or an accrediting authority.

## Routes

| Work | Command |
|---|---|
| Monday review | /weekly-review |
| Cycle and standards coverage | /cycle-review, /evidence-matrix |
| Evidence currency | /evidence-review, /review-evidence |
| Visits and reviewer declarations | /visits-due, /reviewer-check |
| Findings and independent closure | /corrective-actions, /close-finding |
| Committee and renewal preparation | /committee-agenda, /decision-history, /renewals-due |
| Owners and missing records | /owner-load, /attention, /compliance |
| Read and change records | /list, /show, /add, /update, /log, /activity, /help |
| Migration and portability | /import, /export |
| Draft papers | /draft-committee-pack, /draft-findings-letter, /docs |
| Read-only snapshots | /view, /new-view |
| Adapt fields and rules | /customise |

Open the matching .claude/commands file. Every answer about records starts with fresh CLI output. Use --json for machine reads. Codes, case-insensitive names and partial UUIDs resolve records; ambiguous matches stop. entities.json defines allowed fields and references.

## Boundaries

Never send, publish, pay, delete records or invent evidence. Ask for missing actors, reviewer names and decision minutes. Read before changing. A finding's verifier must differ from its owner. Approval records a human committee outcome and requires the database's evidence gates. It does not grant accreditation.

Read docs/compliance.md before interpreting any finding. Due dates and the 60-day renewal window are internal policies. Privacy retention dates trigger human review, not deletion. No claim of legal compliance, licensed-standard coverage or authenticated identity follows from a passing check.

The CLI records before values and actors, but an administrator can change the database directly. Shared operation requires configured access roles and backups. RLS is enabled without public policies. Keep real exports, private documents and credentials out of git. Use npm run demo only on a disposable database. DATABASE_URL selects PostgreSQL; otherwise DATA_DIR holds local PGlite.

Use new migrations for changes and run npm test. Commit on main with trailer Agent: omni-rebuild-strategist. No front end, mail sender, paid model API, scheduled task or credential integration is included. Omni by Enterprise DNA installs and runs a custom version through https://enterprisedna.co/omni/book/?offer=replace-software .
