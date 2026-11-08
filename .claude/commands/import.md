---
description: Import for the accreditation office.
---

# /import

Read docs/replace-armature-fabric.md. Inspect and convert the actual native export before mapping it. Fixtures are synthetic. Preview the mapped file, report additions and conflicts, then run without --dry-run once the operator has authorised the mapping. Reconcile counts, references and evidence. Never invent vendor column names.

```bash
npm run accreditation -- import armature-fabric --kind=<entity> --file=<csv> --map=<mapping.json> --actor=<operator> --dry-run --json
```

Use the human output when useful. Ambiguous names stop and list choices. Check the command exit status before reporting success.
