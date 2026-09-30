<h1 align="center">Fleet for Claude Code</h1>

<p align="center">
  <strong>The open-source fleet maintenance management system that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your fields, your rules, your Fleetio data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=fleetio">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/fleetio?utm_source=github&utm_medium=readme&utm_campaign=fleetio">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#instead-of-fleetio">Instead of Fleetio</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

Fleet for Claude Code does the job you pay Fleetio for, as a Postgres database and a set of agent commands. There is no web front end. You open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask for what you want in plain language. It runs the right query, and it can answer questions the Fleetio dashboard cannot.

Fleetio's published prices are US$4 (Essential, billed annually, or US$5 billed monthly), US$7 (Professional) and US$10 (Premium) per vehicle per month ([fleetio.com/pricing](https://www.fleetio.com/pricing), read 30 September 2026). A 60-vehicle fleet on Professional is US$5,040 a year before add-ons, and the bill grows with every vehicle, trailer and piece of plant you track.

Want the same thing with a web front end, or built on a different stack? That is a customisation, and it is exactly what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=fleetio).

It covers the fleet office: vehicles, odometer readings, service programs by km or date, faults, work orders with labour, parts and tax, parts stock, fuel fills, running costs, and the renewals NZ and AU fleets live by (WoF, CoF, rego, RUC by distance, AU registration and inspections). It is built for trade, service and transport businesses running 10 to 200 vehicles across NZ and Australia, where one person keeps the fleet legal and on the road.

## What it does every week

- **Monday workshop meeting** (`/weekly-review`): what is off the road, what to book, renewals to pay, faults to chase, with an owner on each.
- **Service planning** (`/service-due`, `/plan-services`, `/draft-booking`): due by km or date, whichever comes first, booked once, with the email to the workshop drafted.
- **Renewals** (`/renewals`, `/renew`): WoF, CoF and rego by date, RUC by odometer, AU registration and insurance.
- **Fuel card check** (`/fuel-check`): fills far above that vehicle's usual L/100km, and petrol into a diesel.
- **Cost per km and replacement** (`/costs`, `/replace-plan`): what each vehicle costs to run and which to replace next.

## Ten questions the Fleetio dashboard does not answer out of the box

Fleetio has reports and custom dashboards on its higher plans. These are questions you can ask here in plain words, each answered by a command today, and you can change any of them.

1. Which vehicles are due for service within 1,000 km or 14 days, whichever comes first, and which are not booked? `/service-due`
2. Which NZ vehicles will run past their RUC licence distance in the next 1,000 km? `/renewals`
3. Which WoF, CoF, rego and AU registrations have expired or run out this month? `/renewals`
4. Which fuel fills are more than 25% above that vehicle's own usual litres per 100 km, and on which card? `/fuel-check`
5. Which fills put petrol into a diesel vehicle? `/fuel-check`
6. What does each vehicle cost per km over 12 months, fuel, workshop, rego, RUC, insurance and tolls together? `/costs`
7. Which vehicles show the most replacement signals: age, distance, workshop spend against purchase price, and job count? `/replace-plan`
8. Which workshops take longest to finish a job, and what does an average job cost there? `/vendor-review`
9. Which serious faults have no work order yet, and how old are they? `/attention`
10. Which vehicles have no odometer reading in 30 days, so their service dates are guesses? `/attention`

## Your first hour: ten things to ask for

1. "Put our name, logo and colours on the job sheets" (edit `brand.json`, then `npm run docs`).
2. "Add our depots and vehicles from this list."
3. "Import our Fleetio vehicles export as a test run."
4. "Set up the service intervals from the Hilux and Hiace owner manuals."
5. "Record the WoF, rego and RUC for every vehicle from these photos of the labels."
6. "What is overdue right now, and what should I book this week?"
7. "Book the Hilux in at Onehunga Diesel and draft the email."
8. "Load last month's fuel card statement and tell me anything odd."
9. "Which vehicle should we replace next, and why?"
10. "Add a cost centre to every vehicle and show costs by cost centre." (`/customise`)

## Why no front end

- The front end was only ever there because the database was hard to talk to. That is no longer true.
- Your data sits in plain Postgres tables you own. Any tool can read them. No export, no lock-in.
- No seats, no tiers, no add-ons. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for the honest trade-offs too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/fleet-for-claude-code.git
cd fleet-for-claude-code
npm install
npm run demo
```

Then open the folder in Claude Code and type `/attention` to see what needs a decision today, or `/weekly-review` for the Monday plan. The demo is Totara Services, a fictional plumbing and drainage fleet of seven vehicles in Auckland, Hamilton and Brisbane, with an expired WoF, a RUC licence about to run out, an overdue heavy service and an odd fuel fill already in it.

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared data, no per-seat fee.

## The commands

| Command | What it does |
|---|---|
| `/attention` | Everything needing a decision today |
| `/weekly-review` | The Monday workshop meeting plan |
| `/service-due` | Services overdue or due soon, by km or date, and whether booked |
| `/plan-services` | Opens a work order for each unbooked service that is due |
| `/renewals` | WoF, CoF, rego, RUC (by km), AU registration, inspections, insurance |
| `/renew` | Record a renewed WoF, rego, RUC licence and so on, with its cost |
| `/compliance` | Record checks against NZTA and NHVR rules, each with its source |
| `/issues` | Open faults by priority |
| `/report-issue`, `/resolve-issue` | Log a driver's fault; close one fixed on the spot |
| `/work-orders`, `/history` | Open jobs by workshop and age; completed jobs |
| `/open-wo`, `/add-line`, `/use-part`, `/wo-status`, `/complete` | Run a job from booking to invoice |
| `/draft-booking`, `/draft-driver-notice` | Drafts to the workshop or the driver. Nothing sends |
| `/fuel`, `/fuel-entry`, `/fuel-economy`, `/fuel-check` | Fills, L/100km and the fuel card check |
| `/costs` | 12-month running cost and cents per km |
| `/replace-plan` | Which vehicles to replace next |
| `/vendor-review`, `/depot-review` | Workshops and depots compared |
| `/vehicles`, `/vehicle`, `/drivers`, `/vendors`, `/parts`, `/programs` | The records |
| `/reading`, `/expense`, `/assign`, `/log` | Odometer readings, costs, drivers, notes |
| `/add`, `/set` | Add or change any record |
| `/activity` | Notes and the audit trail |
| `/import`, `/export` | Bring Fleetio data in; take everything out |
| `/customise`, `/new-view` | Make it yours; add a dashboard page |

`npm run view` renders the week and running-cost dashboards to `views/`. `npm run docs` renders job sheets, vehicle service histories and depot cost statements to `docs-out/`, in your brand. Full reference: [docs/cli.md](docs/cli.md).

## Instead of Fleetio

Export your vehicles, fuel entries and service entries from Fleetio as CSV (its import templates download prefilled with your records), then:

```bash
npm run fleet -- import fleetio vehicles vehicles.csv --country=NZ   # a dry run first
npm run fleet -- import fleetio vehicles vehicles.csv --country=NZ --apply
npm run fleet -- import fleetio fuel fuel.csv --apply
npm run fleet -- import fleetio service service.csv --apply
```

Miles become km, US gallons become litres, every original column is kept, and a second run adds nothing. Renewal reminders, service programs, open issues and photos need mapping by hand. [docs/replace-fleetio.md](docs/replace-fleetio.md) has the column map and what does not carry over.

## Checks, not certificates

[docs/compliance.md](docs/compliance.md) lists every record check with its NZTA or NHVR source. A clean check means the records are complete and in date, not that a vehicle is safe. Nothing here sends email, books a workshop or pays a renewal: drafts go to `drafts/` and a person acts.

## Architecture

```
fleet-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         the slash commands
  scripts/fleet.mjs         the CLI the commands drive
  scripts/lib/domain.mjs    every report as one query
  scripts/lib/import.mjs    the Fleetio importer
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  supabase/migrations/      plain SQL schema
  supabase/seed.sql         demo data
  docs/                     compliance sources, the Fleetio guide, the CLI reference
  views.json, documents.json  dashboards and paperwork, rendered in brand.json
```

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, a small CLI, a slash command per recurring job, no front end.

## Want it installed and run for you?

Enterprise DNA installs Fleet for Claude Code for your business, migrates your Fleetio data, connects it to the rest of your tools, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=fleetio)
- Read more: [enterprisedna.co/omni/instead-of/fleetio](https://enterprisedna.co/omni/instead-of/fleetio?utm_source=github&utm_medium=readme&utm_campaign=fleetio)

## License

MIT. Copyright (c) 2026 Enterprise DNA. Not affiliated with Fleetio, NZTA, NHVR or Anthropic. Fleetio is a trademark of its owner.
