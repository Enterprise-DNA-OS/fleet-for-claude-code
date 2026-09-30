---
description: "Log a fault a driver reported."
---
# Report issue

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- report-issue "<vehicle>" "<what is wrong>" --priority=low|medium|high|critical [--by="<name>"]
```

A critical fault takes the vehicle out of service until its job is completed. Say so.

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
