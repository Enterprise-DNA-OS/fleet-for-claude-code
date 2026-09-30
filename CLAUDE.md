# Fleet for Claude Code: operating instructions

This file is the brain. Claude Code reads it at the start of every session. It says who this is for, how work gets done, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR BUSINESS]
- **Operator:** [YOUR NAME], [your role]
- **What matters most:** [the one or two outcomes you care about]

Fill this in once. A worker with context knows. A worker without it guesses.

## How to work

1. **Take a brief, not a script.** The operator describes the outcome. You run the right command and present the answer.
2. **Read before you write.** Before drafting anything about a record, read its full history first.
3. **Plain language.** Short sentences. No filler. Numbers in tables.
4. **Silent success, loud problems.** No play-by-play. Say what broke and what you did about it.
5. **Stop at the line.** Anything that sends, deletes, or faces a customer waits for a yes in this session.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| What needs doing today | `/attention` |
| The Monday workshop meeting | `/weekly-review` |
| What is due for service, booking it, drafting the workshop email | `/service-due`, `/plan-services`, `/draft-booking` |
| WoF, CoF, rego, RUC, AU registration, insurance | `/renewals`, then `/renew` when the new label or receipt arrives |
| Are our records in order | `/compliance` (rules and sources in docs/compliance.md) |
| A driver reported a fault | `/report-issue`, then `/open-wo --issue` |
| Running a job | `/open-wo`, `/add-line`, `/use-part`, `/wo-status`, `/complete` |
| Fuel card statement, odd fills | `/fuel-entry` for each fill, then `/fuel-check` |
| What each vehicle costs, which to replace | `/costs`, `/replace-plan` |
| How the workshops and depots are doing | `/vendor-review`, `/depot-review` |
| One vehicle's whole story | `/vehicle` |
| Odometer readings, tolls, rego paid, driver changes, notes | `/reading`, `/expense`, `/assign`, `/log` |
| Adding or changing records | `/add`, `/set` |
| Moving off Fleetio | `/import` (read docs/replace-fleetio.md), `/export` |
| A new field, rule or interval | `/customise` |
| A new dashboard page | `/new-view` |

If an ask fits nothing here, run the CLI directly (`npm run fleet -- help`, reference in docs/cli.md) and then propose a new command for it.

## Hard rules

- Never send email or messages from here. Draft to `drafts/`, a person sends.
- Never delete records without an explicit yes in this session. Prefer marking closed or archived.
- Never invent a record. If a name is ambiguous, list the candidates and ask.
- The database is the source of truth. If the answer is not in it, say so.
- Never invent an odometer reading, a renewal date, a cost or a repair. Ask for the docket, label or invoice.
- Nothing here certifies a vehicle as safe or roadworthy. Say so when a check comes back clean.
- Keep NZD and AUD apart. Distances are km.
- Import with a dry run first. Never seed a real database.

## Where things live

- `scripts/` the CLI. `scripts/lib/db.mjs` picks `DATABASE_URL` (Postgres, Supabase) or the embedded database in `.data/`.
- `supabase/migrations/` the schema, plain SQL. `npm run migrate` applies it.
- `.claude/commands/` the slash commands. Add one every time the same ask comes twice.
- `docs/` the thesis and the guide for moving off Fleetio.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/instead-of/fleetio
