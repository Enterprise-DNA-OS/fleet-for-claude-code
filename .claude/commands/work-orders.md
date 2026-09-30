---
description: "Open work orders: workshop, status, days open, days since an update, total so far."
---
# Work orders

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- work-orders
```

Call out overdue, on hold and quiet jobs by workshop so the operator can chase them.

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
