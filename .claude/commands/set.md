---
description: "Change fields on a vehicle, driver, vendor, program, part, work order or fault."
---
# Set

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- set <type> "<name>" --field=value ...
```

Read the record first and say what will change. A record cannot move to another vehicle.

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
