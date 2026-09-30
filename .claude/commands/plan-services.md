---
description: "Open a work order for every overdue or due-soon service that is not booked yet."
---
# Plan services

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- plan-services
```

Show what was created, then offer /draft-booking for each.

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
