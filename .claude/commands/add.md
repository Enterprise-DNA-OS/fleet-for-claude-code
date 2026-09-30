---
description: "Add a vehicle, driver, vendor, service program, part or renewal."
---
# Add

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- add <vehicle|driver|vendor|program|part|renewal> --field=value ...
```

Read docs/cli.md for the fields. Money is in dollars (--purchase-price=48500). Show the new record.

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
