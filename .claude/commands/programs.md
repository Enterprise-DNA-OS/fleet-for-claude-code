---
description: "Every service program on every vehicle with its next due km and date."
---
# Programs

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- programs
```

Use when the operator asks what the schedule is, not what is due.

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
