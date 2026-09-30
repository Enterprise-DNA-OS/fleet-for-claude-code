---
description: "Open a work order, optionally for a reported fault and at a workshop."
---
# Open wo

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run fleet -- open-wo "<vehicle>" "<description>" [--vendor="<workshop>"] [--due=YYYY-MM-DD] [--issue="<fault>"]
```

Then offer /draft-booking.

Answer in plain language, tables for numbers, NZD and AUD kept apart. Ambiguous names list the candidates and exit 1: ask which one. Never invent an odometer reading, a renewal date, a cost or a repair. Nothing here certifies a vehicle as safe or roadworthy.
