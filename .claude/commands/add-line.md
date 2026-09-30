---
description: "Add a line of work (and its labour and parts cost) to a work order."
---
# Add line

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- add-line <WO-number> "<task>" [--labour=120] [--parts=85.50] [--program="<service program>"]
```

Link the line to a service program when it is scheduled work, so completing the job resets the program.

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
