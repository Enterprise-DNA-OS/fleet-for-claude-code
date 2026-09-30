---
description: "What is overdue or due soon for service, by km or by date, whichever comes first."
---
# Service due

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- service-due
```

Order by urgency. Say whether each one is already booked. Offer /plan-services for the unbooked ones.

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
