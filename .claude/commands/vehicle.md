---
description: "Everything about one vehicle: renewals, services, open faults, recent work orders, 12-month costs and notes."
---
# Vehicle

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- vehicle "<name, plate fragment or id>"
```

Lead with anything expired or overdue, then the rest.

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
