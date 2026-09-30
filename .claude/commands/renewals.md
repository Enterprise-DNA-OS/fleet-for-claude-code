---
description: "WoF, CoF, rego, RUC, AU inspections and insurance that have expired or fall due soon."
---
# Renewals

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- renewals
```

Expired first. RUC is by odometer, so say how many km are left. Offer /renew once the operator has the new expiry.

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
