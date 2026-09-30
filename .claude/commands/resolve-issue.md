---
description: "Close a fault that was fixed without a work order."
---
# Resolve issue

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- resolve-issue "<fault>" "<what fixed it>"
```

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
