---
description: "Bring vehicles, fuel and service history across from Fleetio CSV exports."
---
# Import

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- import fleetio <vehicles|fuel|service> <file.csv> [--country=NZ|AU] [--currency=] [--date-order=dmy|mdy] [--volume-unit=liters|us_gallons] [--meter-unit=mi] [--apply]
```

Read docs/replace-fleetio.md. Vehicles first, then fuel, then service. Run without --apply first and report the counts and notes. Apply only when the operator agrees.

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
