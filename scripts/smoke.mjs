#!/usr/bin/env node
// npm test: a throwaway database, the migration, the demo fleet, then every report and action
// with assertions on the rules that matter. Needs no secrets. Runs on Windows and Linux.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { run, actions } from './fleet.mjs';
import { reports } from './lib/domain.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-test-'));
process.env.DATA_DIR = path.join(dir, 'db');
process.env.DATABASE_URL = '';
process.env.OUTPUT_DIR = dir;

let db, checks = 0;
const seen = new Set();
const eq = (a, b, msg) => { assert.deepEqual(a, b, msg); checks++; };
const ok = (v, msg) => { assert.ok(v, msg); checks++; };
const call = async (...args) => { seen.add(args[0]); return run(db, args); };
const reject = async (args, re) => { seen.add(args[0]); await assert.rejects(() => run(db, args), re); checks++; };
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const find = (rows, key, value) => rows.find((r) => r[key] === value);
const cli = (...args) => spawnSync(process.execPath, ['scripts/fleet.mjs', ...args], { cwd: REPO_ROOT, env: process.env, encoding: 'utf8' });

try {
  db = await getDb();
  eq((await migrate(db)).ran, ['0001_fleet.sql']);
  eq((await migrate(db)).ran.length, 0);
  await seed(db);
  await seed(db);
  eq((await call('vehicles')).length, 7, 'seed is idempotent');
  for (const name of Object.keys(reports)) ok(Array.isArray(await call(name)), `${name} returns rows`);
  ok((await call('help'))[0].actions.includes('plan-services'));

  // The rituals: what is due, what has expired, what looks wrong.
  const due = await call('service-due');
  eq(find(due, 'vehicle', 'TS-01 Hilux').state, 'overdue', 'Hilux is past its km interval');
  eq(find(due, 'vehicle', 'TS-05 Hino 500').state, 'overdue', 'Hino is past its day interval');
  eq(find(due, 'vehicle', 'TS-04 Ranger').state, 'due soon');
  const renewals = await call('renewals');
  eq(renewals.find((r) => r.vehicle === 'TS-01 Hilux' && r.kind === 'wof').state, 'expired');
  eq(renewals.find((r) => r.vehicle === 'TS-03 Isuzu NPR' && r.kind === 'ruc').km_left, 350, 'RUC counted in km');
  const rules = (await call('compliance')).map((r) => r.rule);
  for (const rule of ['NZ-WOF-COF', 'AU-REGISTRATION', 'AU-HVNL-MAINTENANCE', 'DRIVER-LICENCE']) ok(rules.includes(rule), `compliance finds ${rule}`);
  ok(!rules.includes('CRITICAL-FAULT'), 'the truck with a critical fault is already in the workshop');
  const unusual = (await call('fuel-economy')).filter((r) => r.unusual);
  eq(unusual.map((r) => r.vehicle), ['TS-05 Hino 500'], 'one unusual fill');
  eq(String(unusual[0].l_per_100km), '41.4');
  ok((await call('fuel-check')).some((r) => r.problem === 'wrong fuel for this vehicle'), 'petrol into the diesel Ranger');
  const reasons = (await call('attention')).map((r) => r.reason);
  for (const r of ['service overdue', 'renewal expired', 'fault with no work order', 'work order overdue', 'odometer stale', 'unusual fuel use', 'fuel mismatch', 'driver licence', 'part below reorder level']) ok(reasons.includes(r), `attention shows ${r}`);
  eq((await call('replace-plan'))[0].vehicle, 'TS-07 Old Hiace', 'oldest, busiest van tops the replacement list');
  eq(Number(find(await call('costs'), 'vehicle', 'TS-07 Old Hiace').workshop), 6359.5);
  eq(Object.keys(await call('weekly-review')), ['attention', 'service due', 'renewals', 'work orders']);
  const hilux = await call('vehicle', 'hilux');
  eq(hilux.vehicle[0].plate, 'PLM101');
  ok(hilux.renewals.length === 3 && hilux.services.length === 1);

  // Names: exact, fragment, ambiguous, missing.
  await reject(['vehicle', 'hiace'], /Ambiguous vehicle "hiace"\. Candidates:/);
  await reject(['vehicle', 'no such van'], /No vehicle matches/);
  eq((await call('vehicle', 'old hiace')).vehicle[0].name, 'TS-07 Old Hiace');

  // Meter readings only go forward.
  await reject(['reading', 'TS-06 Corolla', '60000'], /cannot go backwards/);
  await call('reading', 'TS-06 Corolla', '61850');
  ok(!(await call('attention')).some((r) => r.vehicle === 'TS-06 Corolla' && r.reason === 'odometer stale'), 'fresh reading clears the stale flag');

  // Plan the services that are due, once.
  const planned = await call('plan-services');
  eq(planned.map((p) => p.vehicle).sort(), ['TS-01 Hilux', 'TS-04 Ranger', 'TS-05 Hino 500']);
  eq((await call('plan-services')).length, 0, 'booked services are not booked twice');
  ok((await call('service-due')).every((s) => s.booked));
  const hiluxJob = planned.find((p) => p.vehicle === 'TS-01 Hilux').number;
  await call('set', 'work-order', hiluxJob, '--vendor=Onehunga Diesel', `--due-on=${day(3)}`);
  const booking = (await call('draft-booking', hiluxJob))[0];
  ok(fs.readFileSync(booking.file, 'utf8').includes('Onehunga Diesel <bookings@onehunga-diesel.example>'), 'booking draft addressed to the workshop');
  await reject(['complete', hiluxJob, '--odometer=100'], /below/);
  await call('add-line', hiluxJob, 'Replace wiper blades', '--labour=15', '--parts=42.50');
  await call('use-part', hiluxJob, 'Oil filter', '1');
  await reject(['use-part', hiluxJob, 'Brake pads front', '5'], /Not enough/);
  await call('wo-status', hiluxJob, 'in_progress');
  eq((await call('vehicle', 'hilux')).vehicle[0].status, 'in_workshop');
  await call('complete', hiluxJob, '--odometer=184350', '--invoice=OD-6001', '--tax=14.63');
  const done = (await db.query('select * from v_work_orders where number = $1', [hiluxJob]))[0];
  eq(Number(done.total_cents), 10413, 'labour + parts + part used + tax');
  const program = (await db.query("select last_done_km, last_done_on::text from service_programs where name = 'A service (oil and filters)' and vehicle_id = '10000000-0000-4000-8000-000000000001'"))[0];
  eq(program.last_done_km, 184350, 'completing the job resets the program');
  eq((await call('vehicle', 'hilux')).vehicle[0].status, 'active');
  await reject(['complete', hiluxJob, '--odometer=184400'], /completed/);

  // Faults: a critical one takes the vehicle off the road until its job is done.
  await call('report-issue', 'TS-06 Corolla', 'Brake warning light on', '--priority=critical', '--by=Tom Walker');
  eq((await call('vehicle', 'corolla')).vehicle[0].status, 'out_of_service');
  const job = (await call('open-wo', 'TS-06 Corolla', 'Brake warning light', '--issue=Brake warning', '--vendor=Onehunga'))[0];
  await call('add-line', job.number, 'Replace brake fluid level sensor', '--labour=90', '--parts=65');
  await call('complete', job.number, '--odometer=61900');
  eq((await db.query("select status from issues where title = 'Brake warning light on'"))[0].status, 'resolved');
  eq((await call('vehicle', 'corolla')).vehicle[0].status, 'active');
  await call('report-issue', 'TS-02 Hiace', 'Reversing camera flickers', '--priority=low');
  await call('resolve-issue', 'Reversing camera', 'Loose plug refitted by driver');
  await reject(['resolve-issue', 'Reversing camera', 'again'], /already resolved/);
  await call('wo-status', 'WO-1006', 'cancelled');
  await reject(['wo-status', 'WO-1006', 'open'], /cancelled/);

  // Renewals: WoF by date, RUC by distance, cost recorded against the vehicle.
  await reject(['renew', 'TS-01 Hilux', 'ruc', '--next-km=180000'], /not past/);
  await call('renew', 'TS-01 Hilux', 'wof', `--next-due=${day(180)}`, '--reference=WoF 2026 B');
  await call('renew', 'TS-01 Hilux', 'ruc', '--next-km=194900', '--reference=RUC 10,000 km', '--cost=760');
  ok(!(await call('renewals')).some((r) => r.vehicle === 'TS-01 Hilux'), 'Hilux renewals clear');
  eq((await db.query("select count(*)::int n from renewals where vehicle_id = '10000000-0000-4000-8000-000000000001' and kind = 'wof'"))[0].n, 2, 'old WoF kept as history');

  // Fuel, expenses, drivers, notes.
  await reject(['fuel-entry', 'TS-01 Hilux', '60', '150', '181000'], /below the last fill/);
  await call('fuel-entry', 'TS-01 Hilux', '63', '157.50', '184350', '--card=CARD-01', '--vendor=Z Onehunga');
  await call('fuel-entry', 'TS-01 Hilux', '20', '50', '184600', '--partial');
  await call('expense', 'TS-05 Hino 500', 'tolls', '38.20', '--note=Gateway bridge');
  await call('assign', 'TS-02 Hiace', 'Tom Walker');
  eq((await call('drivers')).find((d) => d.name === 'Tom Walker').vehicles, 'TS-02 Hiace, TS-06 Corolla');
  await call('log', 'TS-07 Old Hiace', 'Quote for replacement requested from dealer');
  const notice = (await call('draft-driver-notice', 'TS-05 Hino 500'))[0];
  ok(fs.readFileSync(notice.file, 'utf8').includes('Priya'), 'notice written to the assigned driver');

  // Add and change records, with the guard rails.
  await call('add', 'vehicle', '--name=TS-10 eTransit', '--plate=EV110', '--type=van', '--fuel-type=electric', '--depot=Auckland', '--purchase-price=89000');
  eq(Number((await db.query("select purchase_price_cents from vehicles where name = 'TS-10 eTransit'"))[0].purchase_price_cents), 8900000);
  ok((await call('compliance')).some((r) => r.vehicle === 'TS-10 eTransit' && r.rule === 'NZ-RUC'), 'an EV pays RUC in NZ');
  await call('add', 'program', '--vehicle=TS-10 eTransit', '--name=Annual inspection', '--interval-days=365', `--last-done-on=${day(-10)}`);
  await call('add', 'renewal', '--vehicle=TS-10', '--kind=ruc', '--due-km=10000');
  await reject(['add', 'renewal', '--vehicle=TS-10', '--kind=ruc', '--due-km=20000'], /renewals_one_open|unique/);
  await call('add', 'driver', '--name=Sam Reid', `--licence-expiry=${day(700)}`, '--licence-class=1');
  await call('add', 'vendor', '--name=Te Rapa Auto Electrical', '--kind=workshop');
  await call('add', 'part', '--name=Wiper blade 24in', '--sku=WB-24', '--reorder-at=2', '--unit-cost=18.90');
  await call('set', 'vehicle', 'TS-10', '--depot=Hamilton');
  await reject(['set', 'program', 'Annual inspection', '--vehicle=TS-01'], /cannot move/);
  await reject(['add', 'vehicle', '--name=Bad', '--colour=red'], /Unknown vehicle field --colour/);
  await reject(['add', 'vehicle', '--name=Bad', '--purchase-price=lots'], /amount/);

  // Import from Fleetio: dry run first, then apply, then nothing new on a second run.
  const fx = (f) => path.join(REPO_ROOT, 'fixtures', 'fleetio', f);
  const dry = (await call('import', 'fleetio', 'vehicles', fx('vehicles.csv')))[0];
  eq([dry.mode, dry.inserted, dry.existing], ['dry-run', 2, 1]);
  eq((await db.query("select count(*)::int n from vehicles where name like 'TS-08%'"))[0].n, 0, 'dry run saves nothing');
  const applied = (await call('import', 'fleetio', 'vehicles', fx('vehicles.csv'), '--apply'))[0];
  eq([applied.inserted, applied.existing, applied.converted_miles], [2, 1, 1]);
  eq((await call('import', 'fleetio', 'vehicles', fx('vehicles.csv'), '--apply'))[0].inserted, 0, 'second run adds nothing');
  const canter = (await call('vehicle', 'canter')).vehicle[0];
  eq([canter.odometer, canter.status, canter.type], [100000, 'in_workshop', 'light truck'], 'miles to km, Fleetio status and type mapped');
  eq(canter.source_data['Custom Cost Centre'], 'Plumbing', 'custom fields kept');
  eq((await call('import', 'fleetio', 'fuel', fx('fuel.csv'), '--apply'))[0].inserted, 2);
  eq(Number((await db.query("select total_cents from fuel_entries where reference = 'FLT-F-9002'"))[0].total_cents), 15813, 'total from price per litre');
  eq((await call('import', 'fleetio', 'fuel', fx('fuel.csv'), '--apply'))[0].existing, 2);
  const svc = (await call('import', 'fleetio', 'service', fx('service.csv'), '--apply'))[0];
  eq(svc.inserted, 2, 'two service entries from three lines');
  eq(Number((await db.query("select total_cents from v_work_orders where number = 'FLT-SE-5001'"))[0].total_cents), 28783);
  eq((await call('import', 'fleetio', 'service', fx('service.csv'), '--apply'))[0].existing, 2);
  const svcFile = path.join(dir, 'service-program.csv');
  fs.writeFileSync(svcFile, `external_id,vehicle_name,completed_at,meter_value,service_task,labor_subtotal,parts_subtotal\nSE-6001,TS-02 Hiace,${day(-1)},96900,A service (oil and filters),150,110\n`);
  await call('import', 'fleetio', 'service', svcFile, '--apply');
  eq((await db.query("select last_done_km from service_programs where vehicle_id = '10000000-0000-4000-8000-000000000002'"))[0].last_done_km, 96900, 'a matching Fleetio service task resets the program');
  const bad = path.join(dir, 'bad.csv');
  fs.writeFileSync(bad, 'vehicle_name,date,volume,odometer,total_price\nTS-08 Transit,2026-09-01,50,88500,120\nNo Such Van,2026-09-02,50,1000,120\n');
  await reject(['import', 'fleetio', 'fuel', bad, '--apply'], /not in the database/);
  eq((await db.query('select count(*)::int n from fuel_entries where odometer = 88500'))[0].n, 0, 'a bad row rolls back the whole file');
  fs.writeFileSync(bad, 'vehicle_name,date,volume,odometer\nTS-08 Transit,03/04/2026,50,88600\n');
  await reject(['import', 'fleetio', 'fuel', bad], /--date-order/);
  eq((await call('import', 'fleetio', 'fuel', bad, '--date-order=mdy'))[0].mode, 'dry-run');
  fs.writeFileSync(bad, 'name\n"unterminated\n');
  await reject(['import', 'fleetio', 'vehicles', bad], /Malformed CSV/);
  await reject(['import', 'fleetio', 'parts', bad], /Import one of/);

  // Export, then the rest of the reports on the changed data.
  const snapshot = path.join(dir, 'backup', 'fleet.json');
  ok((await call('export', snapshot))[0].records > 100);
  await reject(['export', snapshot], /EEXIST|exist/);
  for (const name of [...Object.keys(reports), 'activity']) ok(Array.isArray(await call(name)));
  ok((await call('activity')).some((r) => r.kind === 'complete'), 'actions are audited');
  for (const cmd of ['help', 'weekly-review', ...Object.keys(reports), ...actions]) ok(seen.has(cmd), `smoke exercised ${cmd}`);
  await db.close();
  db = null;

  // The CLI as a process: tables, --json, and exit 1 with candidates when a name is ambiguous.
  const json = cli('vehicles', '--json');
  eq(json.status, 0, json.stderr);
  eq(JSON.parse(json.stdout).length, 10);
  const amb = cli('vehicle', 'hiace');
  eq(amb.status, 1);
  ok(amb.stderr.includes('Candidates:'));
  ok(cli('attention').stdout.includes('reason'));

  // Documents and views in the operator's brand.
  for (const script of ['docs', 'view']) {
    const res = spawnSync(process.execPath, [`scripts/${script}.mjs`], { cwd: REPO_ROOT, env: process.env, encoding: 'utf8' });
    eq(res.status, 0, res.stderr);
  }
  ok(fs.readFileSync(path.join(dir, 'views', 'week.html'), 'utf8').includes('Totara Services (demo)'));
  ok(fs.readFileSync(path.join(dir, 'views', 'costs.html'), 'utf8').includes('cents per km'));
  const sheets = fs.readdirSync(path.join(dir, 'docs-out', 'job-sheet'));
  ok(sheets.length > 0);
  ok(fs.readFileSync(path.join(dir, 'docs-out', 'job-sheet', sheets[0]), 'utf8').includes('does not certify'));
  ok(fs.readdirSync(path.join(dir, 'docs-out', 'vehicle-history')).length >= 7);
  ok(fs.readdirSync(path.join(dir, 'docs-out', 'depot-cost-statement')).length === 3);

  const recipes = fs.readdirSync(path.join(REPO_ROOT, '.claude', 'commands')).filter((f) => f.endsWith('.md') && f !== 'README.md');
  console.log(`PASS: ${checks} checks; ${seen.size} CLI commands exercised; ${recipes.length} slash commands; documents and views rendered.`);
} finally {
  await db?.close();
  fs.rmSync(dir, { recursive: true, force: true });
}
