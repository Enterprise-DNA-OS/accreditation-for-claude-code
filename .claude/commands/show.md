---
description: Show for the accreditation office.
---

# /show

Read the current records and explain the result. State dates, owners and missing evidence. Never invent data.

```bash
npm run accreditation -- show --kind=cycles --ref=<code-or-name> --json
```

Use the human output when useful. Ambiguous names stop and list choices. Check the command exit status before reporting success.
