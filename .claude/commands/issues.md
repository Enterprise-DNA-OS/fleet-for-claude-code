---
description: "Open faults by priority, with age and whether a work order exists."
---
# Issues

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- issues
```

Critical and high faults with no work order go first. Offer /open-wo.

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
