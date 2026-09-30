# Record checks and their sources

`npm run fleet -- compliance` (the `/compliance` command) checks the records against the rules below. Each check is a query in the `v_compliance` view in `supabase/migrations/0001_fleet.sql`. A clean result means the records are complete and in date. It does not mean a vehicle is safe, roadworthy or legally compliant: that is a competent person's judgement, and the operator's duty.

Sources were read on 30 September 2026. Rules change. If a source says something different from this page, the source wins: update this page and the check together (`/customise`).

| Rule | What the data must show | Source |
|---|---|---|
| `NZ-WOF-COF` | Every active NZ vehicle (not plant) has an open WoF or CoF record, and it has not expired. Light vehicles need a WoF; heavy and passenger service vehicles need a CoF. How long a WoF lasts depends on the vehicle's age: three years for a new vehicle, then 12 months, or 6 months for vehicles first registered before 1 January 2000. | [NZTA: Warrant of fitness](https://www.nzta.govt.nz/vehicles/warrants-and-certificates/warrant-of-fitness/), [NZTA: Certificate of fitness](https://www.nzta.govt.nz/vehicles/warrants-and-certificates/certificate-of-fitness/) |
| `NZ-LICENCE` | Every active NZ vehicle has an open vehicle licence (rego) record that has not expired. | [NZTA: Vehicle licensing (rego)](https://www.nzta.govt.nz/vehicles/licensing-rego/) |
| `NZ-RUC` | Every NZ vehicle that pays road user charges has an open RUC licence, and the odometer has not passed the licence's end distance. The check treats diesel vehicles, vehicles over 3.5 tonnes, and light electric and plug-in hybrid vehicles as RUC vehicles. Check your own vehicles against NZTA's list of who pays and who is exempt. | [NZTA: Road user charges](https://www.nzta.govt.nz/vehicles/licensing-rego/road-user-charges/) |
| `AU-REGISTRATION` | Every active AU vehicle has an open registration record that has not expired. Registration is run by each state and territory; record the state in the reference. | Your state or territory registration authority |
| `AU-HVNL-MAINTENANCE` | Every active AU heavy vehicle (GVM over 4.5 tonnes) has a completed maintenance record in the last 12 months and no overdue service program. The Heavy Vehicle National Law puts a primary duty on every party in the chain of responsibility to ensure the safety of their transport activities, which includes keeping heavy vehicles maintained to the vehicle standards. The 12-month window is this system's check, not a figure from the law: set your own interval. | [NHVR: Heavy Vehicle National Law and Regulations](https://www.nhvr.gov.au/law-policies/heavy-vehicle-national-law-and-regulations), [NHVR: The primary duty](https://www.nhvr.gov.au/safety-accreditation-compliance/chain-of-responsibility/primary-duty) |
| `CRITICAL-FAULT` | No vehicle marked active has an open critical fault. Reporting a critical fault takes the vehicle out of service; this catches one put back by hand. | Operator policy |
| `DRIVER-LICENCE` | Every driver assigned to an active vehicle has a licence expiry on record that has not passed. Check the licence class against the vehicle yourself. | [NZTA: Driver licences](https://www.nzta.govt.nz/driver-licences/), your state or territory licensing authority |

## What the checks do not do

- They do not read NZTA or state registers. Dates come from your records, so keep them current with `/renew` when a label or receipt arrives.
- They do not know a vehicle's condition. A WoF, CoF, inspection or competent person does.
- They do not cover work health and safety duties for vehicles as a workplace, fatigue, mass, dimension or loading rules. Add a rule with `/customise` when your business needs one, with its source.

Nothing here is legal advice.
