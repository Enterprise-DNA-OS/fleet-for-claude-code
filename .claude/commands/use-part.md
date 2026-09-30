---
description: "Take parts from stock onto a work order."
---
# Use part

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- use-part <WO-number> "<part>" <quantity>
```

Stock cannot go below zero.

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
