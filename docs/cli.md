# The fleet CLI

`npm run fleet -- <command> [args] [--flags]`. Every slash command runs one of these. Output is a table; add `--json` for machines. Names match an exact id or name first, then a fragment of either. When more than one matches, the candidates are listed and the command exits 1.

## Reports

| Command | What it answers |
|---|---|
| `vehicles` | Every vehicle, depot, status, odometer, last reading, driver |
| `vehicle <name>` | One vehicle: renewals, services, faults, work orders, costs, notes |
| `drivers`, `vendors`, `parts` | The lists, with licence expiry and reorder flags |
| `service-due` | Overdue and due-soon services, by km or date, whichever comes first, and whether booked |
| `programs` | Every service program and its next due km and date |
| `renewals` | Expired and due-soon WoF, CoF, rego, RUC (by km), AU inspection, insurance |
| `issues` | Open faults by priority and age |
| `work-orders`, `history` | Open jobs with days open and days quiet; the last 30 completed |
| `fuel`, `fuel-economy`, `fuel-check` | Fills; L/100km full to full against the vehicle's usual; unusual fills and wrong fuel |
| `costs` | 12 months of fuel, workshop and other costs, km travelled and cents per km, per currency |
| `replace-plan` | Replacement signals: age 8+, 300,000+ km, workshop spend over 15% of purchase price, 4+ jobs a year |
| `vendor-review`, `depot-review` | Workshops by jobs, average cost and days; depots by what is overdue |
| `attention` | Everything needing a decision, in one list |
| `compliance` | The record checks in docs/compliance.md |
| `weekly-review` | attention, service due, renewals and open work orders together |
| `activity` | Notes and the audit trail |

## Actions

All actions run in one transaction and are written to `audit`.

| Command | Notes |
|---|---|
| `add <vehicle\|driver\|vendor\|program\|part\|renewal> --field=value` | Vehicle: name plate vin year make model type depot country status fuel-type gvm-kg driver purchase-date purchase-price currency. Program: vehicle name interval-km interval-days last-done-on last-done-km reference. Renewal: vehicle kind due-on due-km reference. Part: name sku reorder-at unit-cost currency vendor. Money in dollars |
| `set <type> <name> --field=value` | Same fields, plus work-order (vendor, due-on, description, invoice-ref, tax) and issue (title, priority, reported-by) |
| `reading <vehicle> <km> [--on=]` | Cannot go backwards |
| `report-issue <vehicle> "<fault>" --priority= [--by=]` | Critical takes the vehicle out of service |
| `resolve-issue <fault> "<fix>"` | |
| `open-wo <vehicle> "<description>" [--vendor=] [--due=] [--issue=]` | Numbers run WO-1001, WO-1002 |
| `add-line <WO> "<task>" [--labour=] [--parts=] [--program=]` | |
| `use-part <WO> <part> <qty>` | Stock cannot go negative |
| `wo-status <WO> <open\|in_progress\|on_hold\|cancelled>` | |
| `complete <WO> --odometer= [--invoice=] [--tax=]` | Resets linked programs, resolves the job's faults, returns the vehicle to active if nothing critical is open |
| `plan-services` | Opens one job per unbooked overdue or due-soon service |
| `renew <vehicle> <kind> --next-due= \| --next-km= [--reference=] [--cost=]` | Closes the open renewal and opens the next; `--cost` records an expense |
| `fuel-entry <vehicle> <litres> <total> <odometer> [--on= --card= --vendor= --partial --fuel=]` | Rejects an odometer below the last fill |
| `expense <vehicle> <kind> <amount> [--on= --note=]` | registration, ruc, insurance, tolls, tyres, fines, other |
| `assign <vehicle> <driver\|none>`, `log <vehicle> "<note>"` | |
| `draft-booking <WO>`, `draft-driver-notice <vehicle>` | Markdown drafts in `drafts/`. Nothing sends |
| `import fleetio <vehicles\|fuel\|service> <file> [--apply]` | See docs/replace-fleetio.md |
| `export <file.json>` | Every record; will not overwrite |

## Settings

One row in `settings`: business name, timezone (the fleet's calendar day), due-soon km (1,000) and days (14), renewal warning days (30), quiet days (7), stale reading days (30). Change them with a query or `/customise`.
