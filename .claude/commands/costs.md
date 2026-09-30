---
description: "Running cost per vehicle over the last 12 months: fuel, workshop, other, distance and cents per km."
---
# Costs

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- costs
```

Rank by cents per km within each currency. Say where the distance is thin (few readings).

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
