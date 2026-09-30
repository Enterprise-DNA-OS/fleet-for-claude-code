---
description: "The fuel card check: unusual fills and wrong fuel for the vehicle."
---
# Fuel check

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- fuel-check
```

Present each as a question for the operator to check against the docket, never as an accusation.

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
