---
description: "Complete a work order with the odometer out, invoice and tax."
---
# Complete

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- complete <WO-number> --odometer=<km> [--invoice=<ref>] [--tax=<amount>]
```

Completing resets linked service programs, resolves the job's faults and puts the vehicle back on the road only if nothing critical is still open.

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
