---
description: "Write every record to one JSON file."
---
# Export

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- export <file.json>
```

The file will not overwrite an existing one. Treat it as business data.

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
