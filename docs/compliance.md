# Accreditation record checks

Checked 8 November 2026. This tool checks the completeness of internal records. It does not accredit an organisation, certify compliance, verify document contents or interpret a licensed standard. Your committee makes the decision. Demo standards are fictional, not copies of ISO, NZQA or JASANZ requirements.

[JASANZ explains its assessment process](https://www.jasanz.org/how-it-works): assessments consider impartiality, records and competence; findings need corrective action with evidence; an accreditation decision follows. These concepts informed the checks below. Exact workflows and deadlines are local policies, not universal statutory rules.

| Rule | Check | Authority |
|---|---|---|
| EVIDENCE-GAP | Each required standard has at least one dated review of evidence that has not expired | Internal completeness policy, informed by the JASANZ process |
| FINDING-DUE | An open corrective action has passed its assigned deadline | Internal due date, informed by the JASANZ corrective-action step |
| CYCLE-DUE | An active cycle passed its due date | Internal schedule |
| VISIT-DUE | A planned visit passed without a completed report | Internal schedule and evidence policy |
| REVIEWER-CONFLICT | Conflict declaration missing or a declared conflict unresolved | Internal review policy, informed by JASANZ impartiality assessment |
| REVIEWER-MISSING | No assigned person has a clear declaration | Internal review policy |
| STANDARD-MISSING | No required standards assigned | Internal coverage policy |
| RENEWAL-DUE | Renewal within 60 days or already overdue | Internal planning window, configurable |
| PRIVACY-REVIEW | Personal evidence has no retention review date or it has passed | NZ Privacy Act 2020 principle 9, plus an internal review date |

[Privacy Commissioner, principle 9](https://www.privacy.org.nz/privacy-principles/9/) requires that personal information not be kept longer than its lawful purpose needs. The law does not prescribe the demo review dates. The command asks a person to review purpose and other retention duties. It never deletes information or treats a date alone as proof of unlawful retention. Configure jurisdiction and retention rules before real use.

## Write gates

An approved committee outcome requires an active cycle, at least one required standard, current reviewed evidence for every required standard, no open corrective actions, a completed visit report, at least one clear reviewer declaration and no unknown or declared conflicts. These are conservative internal gates, not an accreditation body's official decision criteria. A recused reviewer is excluded from the clear-reviewer count. An expired review remains in history but cannot satisfy the gate.

A closed finding needs a dated resolution and a verifier whose recorded name differs from its owner. A visit completion needs its report reference. Evidence review, declaration, closure and decision dates cannot be in the future. Every committee decision needs minutes, a committee name and rationale. These checks do not authenticate identities or inspect documents. Approval describes a recorded human outcome, not software authority to award accreditation.

Database constraints enforce the critical gates even for import. CLI writes record the actor and before values; database owners can change data directly. The history is not a tamper-proof regulatory archive. Shared deployments need access roles, backups and reviewed operating procedures. Public database roles have no default access.
