---
description: "Record a fuel fill from a docket or card statement."
---
# Fuel entry

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- fuel-entry "<vehicle>" <litres> <total $> <odometer> [--on=] [--card=] [--vendor=] [--partial] [--fuel=diesel|petrol]
```

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
