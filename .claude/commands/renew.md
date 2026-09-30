---
description: "Record a renewed WoF, CoF, rego, RUC licence, inspection or insurance."
---
# Renew

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- renew "<vehicle>" <wof|cof|registration|ruc|au_inspection|insurance|other> --next-due=YYYY-MM-DD | --next-km=<odometer> [--reference=] [--cost=]
```

Ask for the new expiry from the label, licence or receipt. Never guess it. The old record is kept as history.

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
