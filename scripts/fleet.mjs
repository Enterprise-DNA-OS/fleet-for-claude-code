#!/usr/bin/env node
// The fleet CLI. Every slash command in .claude/commands runs one of these.
//   npm run fleet -- <report>                     vehicles, service-due, renewals, attention, costs, ... (see help)
//   npm run fleet -- <action> <args> [--flags]    add, set, reading, report-issue, open-wo, complete, renew, fuel-entry, ...
// Human tables by default, --json for machines. Names match exactly, then by fragment; ambiguous lists candidates and exits 1.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { table } from './lib/format.mjs';
import { entities, refs, money, reports, resolve } from './lib/domain.mjs';
import { importFleetio, toDate } from './lib/import.mjs';

export const actions = ['vehicle', 'add', 'set', 'reading', 'report-issue', 'resolve-issue', 'open-wo', 'add-line', 'use-part', 'wo-status', 'complete',
  'plan-services', 'renew', 'fuel-entry', 'expense', 'assign', 'log', 'draft-booking', 'draft-driver-notice', 'import', 'export'];
const BOOLEAN_FLAGS = ['json', 'apply', 'partial', 'help'];

export function parseArgs(args) {
  const flags = {}, pos = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) { pos.push(a); continue; }
    const eq = a.indexOf('=');
    if (eq >= 0) flags[a.slice(2, eq).replaceAll('-', '_')] = a.slice(eq + 1);
    else if (BOOLEAN_FLAGS.includes(a.slice(2))) flags[a.slice(2)] = true;
    else if (args[i + 1] !== undefined && !args[i + 1].startsWith('--')) flags[a.slice(2).replaceAll('-', '_')] = args[++i];
    else throw Error(`Flag ${a} needs a value`);
  }
  return { flags, pos };
}

const required = (v, what) => { if (v === undefined || v === null || String(v).trim() === '') throw Error(`Required: ${what}`); return v; };
function toCents(v, what) {
  const n = Number(String(required(v, what)).replace(/[$,]/g, ''));
  if (!Number.isFinite(n) || n < 0) throw Error(`${what} must be an amount like 412.50`);
  return Math.round(n * 100);
}
function km(v, what) {
  const n = Number(String(required(v, what)).replace(/,/g, ''));
  if (!Number.isInteger(n) || n < 0) throw Error(`${what} must be a whole number of km`);
  return n;
}
const isoDay = (v, what) => (v === undefined ? null : toDate(v, 'dmy', what));
const OPEN = ['open', 'in_progress', 'on_hold'];

async function audit(db, action, id, detail) {
  await db.query('insert into audit (action, record_id, detail) values ($1, $2, $3)', [action, id || null, JSON.stringify(detail)]);
}

// add/set: --field=value pairs checked against the entity's allowed list; names resolve to ids, dollars to cents.
async function record(db, entity, flags, existing = null) {
  const def = entities[entity];
  if (!def) throw Error(`Record type must be one of ${Object.keys(entities).join(', ')}`);
  const [tableName, , allowed] = def;
  const cols = [], vals = [];
  for (const [key, raw] of Object.entries(flags)) {
    if (key === 'json') continue;
    if (!allowed.includes(key)) throw Error(`Unknown ${entity} field --${key}. Allowed: ${allowed.join(', ')}`);
    if (existing && key === 'vehicle') throw Error('A record cannot move to another vehicle; add a new one');
    let v = raw === 'null' ? null : raw;
    let col = key;
    if (refs[key]) { col = refs[key][0]; if (v !== null) v = (await resolve(db, refs[key][1], v)).id; }
    else if (money[key]) { col = money[key]; if (v !== null) v = toCents(v, key); }
    else if (/_on$|_expiry$|_date$/.test(key) && v !== null) v = isoDay(v, key);
    cols.push(col); vals.push(v);
  }
  if (!cols.length) throw Error('Give at least one --field=value');
  if (existing) {
    vals.push(existing.id);
    return db.query(`update ${tableName} set ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')} where id = $${vals.length} returning *`, vals);
  }
  return db.query(`insert into ${tableName} (${cols.join(', ')}) values (${vals.map((_, i) => `$${i + 1}`).join(', ')}) returning *`, vals);
}

async function openOrder(db, w) {
  if (!OPEN.includes(w.status)) throw Error(`${w.number} is ${w.status}`);
  return w;
}

async function nextNumber(db) {
  const [r] = await db.query("select coalesce(max(substring(number from '^WO-(\\d+)$')::int), 1000) + 1 n from work_orders");
  return `WO-${r.n}`;
}

async function writeDraft(name, body) {
  const dir = path.resolve(process.env.OUTPUT_DIR || REPO_ROOT, 'drafts');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}-${Date.now()}.md`);
  fs.writeFileSync(file, body, { flag: 'wx' });
  return file;
}

export async function run(db, args) {
  const { pos, flags } = parseArgs(args);
  const [cmd = 'help', a, b, c, d] = pos;
  if (cmd === 'help' || flags.help) return [{ reports: [...Object.keys(reports), 'weekly-review'].join(', '), actions: actions.join(', '), guide: 'docs/cli.md' }];
  if (reports[cmd]) return db.query(reports[cmd]);
  if (cmd === 'weekly-review') {
    return { attention: await db.query(reports.attention), 'service due': await db.query(reports['service-due']), renewals: await db.query(reports.renewals), 'work orders': await db.query(reports['work-orders']) };
  }
  if (cmd === 'vehicle') {
    const v = await resolve(db, 'vehicle', a);
    return {
      vehicle: [v],
      renewals: await db.query('select kind, due_on, days_left, due_km, km_left, state from v_renewals where vehicle_id = $1', [v.id]),
      services: await db.query('select service, due_km, km_left, due_on, days_left, state from v_service_due where vehicle_id = $1', [v.id]),
      faults: await db.query("select title, priority, reported_on from issues where vehicle_id = $1 and status = 'open'", [v.id]),
      'work orders': await db.query('select number, status, vendor, opened_on, completed_on, description, currency, round(total_cents / 100.0, 2) total from v_work_orders where vehicle_id = $1 order by opened_on desc limit 10', [v.id]),
      costs: await db.query('select currency, round(fuel_cents / 100.0, 2) fuel, round(workshop_cents / 100.0, 2) workshop, round(other_cents / 100.0, 2) other, km, cents_per_km from v_costs where vehicle_id = $1', [v.id]),
      notes: await db.query('select note, created_at from notes where vehicle_id = $1 order by created_at desc limit 5', [v.id]),
    };
  }
  if (cmd === 'export') {
    const file = path.resolve(required(a, 'output file, for example backup/fleet.json'));
    const snapshot = { version: 1, exported_at: new Date().toISOString(), records: {} };
    for (const t of ['settings', 'drivers', 'vendors', 'vehicles', 'meter_readings', 'service_programs', 'work_orders', 'work_order_lines', 'issues', 'parts', 'part_uses', 'fuel_entries', 'expenses', 'renewals', 'notes', 'audit', 'import_rows']) {
      snapshot.records[t] = await db.query(`select * from ${t}`);
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx' });
    return [{ file, records: Object.values(snapshot.records).reduce((n, r) => n + r.length, 0) }];
  }
  if (cmd === 'draft-booking') {
    const w = await resolve(db, 'work-order', a);
    const [row] = await db.query('select * from v_work_orders where id = $1', [w.id]);
    const [v] = await db.query('select * from vehicles where id = $1', [w.vehicle_id]);
    const [vendor] = w.vendor_id ? await db.query('select * from vendors where id = $1', [w.vendor_id]) : [null];
    const lines = await db.query('select task from work_order_lines where work_order_id = $1', [w.id]);
    const faults = await db.query("select title, priority from issues where work_order_id = $1 and status = 'open'", [w.id]);
    const file = await writeDraft(`booking-${w.number}`, [
      `# Draft workshop booking: ${w.number}`, '', 'For review. Nothing has been sent.', '',
      `To: ${vendor ? `${vendor.name} <${vendor.email || 'no email on file'}>` : 'in-house workshop'}`,
      `Subject: Booking request ${w.number}, ${v.name} (${v.plate})`, '',
      `Hi${vendor ? ` ${vendor.name}` : ''},`, '',
      `Please book in ${v.make} ${v.model}, plate ${v.plate}, at about ${v.odometer} km${row.due_on ? `, needed back by ${row.due_on}` : ''}.`, '',
      'Work requested:', ...lines.map((l) => `- ${l.task}`), ...faults.map((f) => `- Fault reported (${f.priority}): ${f.title}`), '',
      `Please quote before any work over the agreed limit and reference ${w.number} on the invoice.`, '', 'Thanks,', '[your name]', ''].join('\n'));
    return [{ file, status: 'draft' }];
  }
  if (cmd === 'draft-driver-notice') {
    const v = await resolve(db, 'vehicle', a);
    const [driver] = v.driver_id ? await db.query('select * from drivers where id = $1', [v.driver_id]) : [null];
    const due = [
      ...(await db.query("select upper(kind) || coalesce(' due ' || due_on, '') || coalesce(' at ' || due_km || ' km', '') item from v_renewals where vehicle_id = $1 and state <> 'ok'", [v.id])),
      ...(await db.query("select service || ' (' || state || ')' item from v_service_due where vehicle_id = $1 and state <> 'ok'", [v.id])),
    ];
    const file = await writeDraft(`driver-${v.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`, [
      `# Draft note to ${driver?.name || 'the driver'} about ${v.name}`, '', 'For review. Nothing has been sent.', '',
      `Hi ${driver?.name?.split(' ')[0] || 'there'},`, '',
      due.length ? `${v.name} (${v.plate}) needs the following sorted:` : `${v.name} (${v.plate}) has nothing due right now.`, ...due.map((x) => `- ${x.item}`), '',
      'Please send me a photo of the odometer today so the service dates stay right.', '', 'Thanks', ''].join('\n'));
    return [{ file, status: 'draft', items: due.length }];
  }
  if (!actions.includes(cmd)) throw Error(`Unknown command "${cmd}". Run help.`);

  await db.exec('BEGIN');
  let result;
  try {
    // One writer at a time on a shared database; reads carry on.
    await db.exec('LOCK TABLE vehicles IN SHARE ROW EXCLUSIVE MODE');
    if (cmd === 'add') result = await record(db, a, Object.fromEntries(Object.entries(flags).filter(([k]) => k !== 'json')));
    else if (cmd === 'set') result = await record(db, a, Object.fromEntries(Object.entries(flags).filter(([k]) => k !== 'json')), await resolve(db, a, b));
    else if (cmd === 'import') {
      if (a !== 'fleetio') throw Error('Supported import: fleetio vehicles|fuel|service <file.csv>');
      result = await importFleetio(db, b, c, flags);
    } else if (cmd === 'reading') {
      const v = await resolve(db, 'vehicle', a);
      const value = km(b, 'odometer');
      const on = isoDay(flags.on, '--on') || (await db.query('select fleet_today()::text d'))[0].d;
      if (value < v.odometer) throw Error(`Odometer cannot go backwards: ${v.name} is already at ${v.odometer} km`);
      result = await db.query('insert into meter_readings (vehicle_id, read_on, value, source) values ($1, $2, $3, $4) returning *', [v.id, on, value, flags.source || 'manual']);
      await db.query('update vehicles set odometer = $1, meter_read_on = greatest(coalesce(meter_read_on, $2::date), $2::date) where id = $3', [value, on, v.id]);
    } else if (cmd === 'report-issue') {
      const v = await resolve(db, 'vehicle', a);
      const priority = flags.priority || 'medium';
      result = await db.query('insert into issues (vehicle_id, title, priority, reported_by) values ($1, $2, $3, $4) returning *', [v.id, required(b, 'what is wrong'), priority, flags.by || '']);
      // A critical fault takes the vehicle off the road until a person puts it back.
      if (priority === 'critical' && v.status === 'active') await db.query("update vehicles set status = 'out_of_service' where id = $1", [v.id]);
    } else if (cmd === 'resolve-issue') {
      const i = await resolve(db, 'issue', a);
      if (i.status !== 'open') throw Error('That fault is already resolved');
      result = await db.query("update issues set status = 'resolved', resolved_on = fleet_today(), resolution = $1 where id = $2 returning *", [required(b, 'what fixed it'), i.id]);
    } else if (cmd === 'open-wo') {
      const v = await resolve(db, 'vehicle', a);
      const vendor = flags.vendor ? (await resolve(db, 'vendor', flags.vendor)).id : null;
      result = await db.query('insert into work_orders (number, vehicle_id, vendor_id, due_on, description, odometer, currency) values ($1, $2, $3, $4, $5, $6, $7) returning *',
        [await nextNumber(db), v.id, vendor, isoDay(flags.due, '--due'), required(b, 'description'), v.odometer, v.currency]);
      if (flags.issue) {
        const i = await resolve(db, 'issue', flags.issue, v.id);
        await db.query('update issues set work_order_id = $1 where id = $2', [result[0].id, i.id]);
        await db.query('insert into work_order_lines (work_order_id, task) values ($1, $2)', [result[0].id, `Fault: ${i.title}`]);
      }
    } else if (cmd === 'add-line') {
      const w = await openOrder(db, await resolve(db, 'work-order', a));
      const program = flags.program ? (await resolve(db, 'program', flags.program, w.vehicle_id)).id : null;
      result = await db.query('insert into work_order_lines (work_order_id, task, program_id, labour_cents, parts_cents, notes) values ($1, $2, $3, $4, $5, $6) returning *',
        [w.id, required(b, 'task'), program, flags.labour ? toCents(flags.labour, '--labour') : 0, flags.parts ? toCents(flags.parts, '--parts') : 0, flags.notes || '']);
      await db.query('update work_orders set updated_at = now() where id = $1', [w.id]);
    } else if (cmd === 'use-part') {
      const w = await openOrder(db, await resolve(db, 'work-order', a));
      const p = await resolve(db, 'part', b);
      const qty = Number(required(c, 'quantity'));
      if (!(qty > 0)) throw Error('Quantity must be more than zero');
      const taken = await db.query('update parts set stock = stock - $1 where id = $2 and stock >= $1 returning *', [qty, p.id]);
      if (!taken.length) throw Error(`Not enough ${p.name} in stock (${p.stock})`);
      result = await db.query('insert into part_uses (work_order_id, part_id, quantity, unit_cost_cents) values ($1, $2, $3, $4) returning *', [w.id, p.id, qty, p.unit_cost_cents]);
    } else if (cmd === 'wo-status') {
      const w = await openOrder(db, await resolve(db, 'work-order', a));
      if (!['open', 'in_progress', 'on_hold', 'cancelled'].includes(b)) throw Error('Status must be open, in_progress, on_hold or cancelled. Use complete to close with an odometer');
      result = await db.query('update work_orders set status = $1 where id = $2 returning number, status', [b, w.id]);
      if (b === 'in_progress') await db.query("update vehicles set status = 'in_workshop' where id = $1 and status = 'active'", [w.vehicle_id]);
    } else if (cmd === 'complete') {
      const w = await openOrder(db, await resolve(db, 'work-order', a));
      const odo = km(flags.odometer, '--odometer');
      const [v] = await db.query('select * from vehicles where id = $1', [w.vehicle_id]);
      if (odo < (w.odometer || 0)) throw Error(`Odometer ${odo} is below the ${w.odometer} km recorded when the job was opened`);
      if (!(await db.query('select 1 from work_order_lines where work_order_id = $1', [w.id])).length) throw Error('Add at least one line (the work done) before completing');
      result = await db.query("update work_orders set status = 'completed', completed_on = fleet_today(), odometer = $1, invoice_ref = coalesce($2, invoice_ref), tax_cents = coalesce($3, tax_cents) where id = $4 returning number, status, completed_on",
        [odo, flags.invoice ?? null, flags.tax ? toCents(flags.tax, '--tax') : null, w.id]);
      await db.query('update service_programs set last_done_on = fleet_today(), last_done_km = $1 where id in (select program_id from work_order_lines where work_order_id = $2 and program_id is not null)', [odo, w.id]);
      if (odo > v.odometer) {
        await db.query("insert into meter_readings (vehicle_id, value, source) values ($1, $2, 'work order')", [v.id, odo]);
        await db.query('update vehicles set odometer = $1, meter_read_on = fleet_today() where id = $2', [odo, v.id]);
      }
      // Faults on the job are fixed by it; the vehicle goes back on the road only if nothing critical is still open.
      await db.query("update issues set status = 'resolved', resolved_on = fleet_today(), resolution = 'Fixed on ' || $1 where work_order_id = $2 and status = 'open'", [w.number, w.id]);
      await db.query(`update vehicles set status = 'active' where id = $1 and status in ('in_workshop', 'out_of_service')
        and not exists (select 1 from issues where vehicle_id = $1 and status = 'open' and priority = 'critical')
        and not exists (select 1 from work_orders where vehicle_id = $1 and status in ('open', 'in_progress', 'on_hold'))`, [v.id]);
    } else if (cmd === 'plan-services') {
      const due = await db.query("select * from v_service_due where state in ('overdue', 'due soon') and not booked order by vehicle");
      result = [];
      for (const s of due) {
        const [v] = await db.query('select * from vehicles where id = $1', [s.vehicle_id]);
        const [w] = await db.query('insert into work_orders (number, vehicle_id, due_on, description, odometer, currency) values ($1, $2, greatest(coalesce($3::date, fleet_today()), fleet_today()), $4, $5, $6) returning id, number',
          [await nextNumber(db), v.id, s.due_on, s.service, v.odometer, v.currency]);
        await db.query('insert into work_order_lines (work_order_id, task, program_id) values ($1, $2, $3)', [w.id, s.service, s.id]);
        result.push({ number: w.number, vehicle: s.vehicle, service: s.service, state: s.state });
      }
    } else if (cmd === 'renew') {
      const v = await resolve(db, 'vehicle', a);
      const kind = required(b, 'kind (wof, cof, registration, ruc, au_inspection, insurance, other)');
      const [open] = await db.query('select * from renewals where vehicle_id = $1 and kind = $2 and done_on is null', [v.id, kind]);
      const nextOn = isoDay(flags.next_due, '--next-due');
      const nextKm = flags.next_km !== undefined ? km(flags.next_km, '--next-km') : null;
      if (!nextOn && nextKm === null) throw Error('Give the new expiry: --next-due=YYYY-MM-DD, or --next-km=<odometer> for RUC');
      if (nextKm !== null && nextKm <= v.odometer) throw Error(`--next-km ${nextKm} is not past the current odometer ${v.odometer}`);
      if (open) await db.query('update renewals set done_on = fleet_today() where id = $1', [open.id]);
      result = await db.query('insert into renewals (vehicle_id, kind, due_on, due_km, reference) values ($1, $2, $3, $4, $5) returning *', [v.id, kind, nextOn, nextKm, flags.reference || '']);
      if (flags.cost) await db.query('insert into expenses (vehicle_id, kind, amount_cents, currency, note) values ($1, $2, $3, $4, $5)',
        [v.id, kind === 'ruc' ? 'ruc' : kind === 'insurance' ? 'insurance' : kind === 'registration' ? 'registration' : 'other', toCents(flags.cost, '--cost'), v.currency, `${kind} renewal ${flags.reference || ''}`.trim()]);
    } else if (cmd === 'fuel-entry') {
      const v = await resolve(db, 'vehicle', a);
      const litres = Number(required(b, 'litres'));
      if (!(litres > 0)) throw Error('Litres must be more than zero');
      const odo = km(d, 'odometer');
      const [last] = await db.query('select max(odometer) m from fuel_entries where vehicle_id = $1', [v.id]);
      if (last.m !== null && odo < Number(last.m)) throw Error(`Odometer ${odo} is below the last fill at ${last.m} km. Check the docket`);
      const fuel = flags.fuel || (v.fuel_type === 'diesel' ? 'diesel' : 'petrol');
      result = await db.query('insert into fuel_entries (vehicle_id, filled_on, litres, total_cents, odometer, partial, fuel_type, vendor, card, reference, currency) values ($1, coalesce($2, fleet_today()), $3, $4, $5, $6, $7, $8, $9, $10, $11) returning *',
        [v.id, isoDay(flags.on, '--on'), litres, toCents(c, 'total'), odo, !!flags.partial, fuel, flags.vendor || '', flags.card || '', flags.reference || '', v.currency]);
      if (odo > v.odometer) await db.query('update vehicles set odometer = $1, meter_read_on = coalesce($2, fleet_today()) where id = $3', [odo, isoDay(flags.on, '--on'), v.id]);
    } else if (cmd === 'expense') {
      const v = await resolve(db, 'vehicle', a);
      result = await db.query('insert into expenses (vehicle_id, kind, spent_on, amount_cents, currency, note) values ($1, $2, coalesce($3, fleet_today()), $4, $5, $6) returning *',
        [v.id, required(b, 'kind'), isoDay(flags.on, '--on'), toCents(c, 'amount'), v.currency, flags.note || '']);
    } else if (cmd === 'assign') {
      const v = await resolve(db, 'vehicle', a);
      const driver = b === 'none' ? null : await resolve(db, 'driver', b);
      result = await db.query('update vehicles set driver_id = $1 where id = $2 returning name, driver_id', [driver?.id || null, v.id]);
    } else if (cmd === 'log') {
      const v = await resolve(db, 'vehicle', a);
      result = await db.query('insert into notes (vehicle_id, note) values ($1, $2) returning *', [v.id, required(b, 'note')]);
    }
    await audit(db, cmd, result?.[0]?.id && /^[0-9a-f-]{36}$/.test(result[0].id) ? result[0].id : null, { args: pos.slice(1), flags });
    await db.exec(cmd === 'import' && !flags.apply ? 'ROLLBACK' : 'COMMIT');
    return result;
  } catch (e) {
    await db.exec('ROLLBACK');
    throw e;
  }
}

const HIDE = new Set(['source_data', 'created_at', 'updated_at', 'raw']);
export function format(value) {
  if (Array.isArray(value)) {
    if (!value.length) return '  (none)';
    const cols = Object.keys(value[0]).filter((k) => !HIDE.has(k));
    const rows = value.map((r) => Object.fromEntries(cols.map((k) => {
      const v = r[k];
      return [k, v instanceof Date ? v.toISOString().slice(0, 10) : v && typeof v === 'object' ? JSON.stringify(v) : v];
    })));
    return table(rows, cols.map((k) => ({ key: k, label: k.replaceAll('_', ' '), width: k === 'id' || k.endsWith('_id') ? 8 : 60 })));
  }
  return Object.entries(value).map(([k, v]) => `${k.toUpperCase()}\n${format(Array.isArray(v) ? v : [v])}`).join('\n\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  let db;
  try {
    db = await getDb();
    const result = await run(db, process.argv.slice(2));
    console.log(process.argv.includes('--json') ? JSON.stringify(result, null, 2) : format(result));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await db?.close();
  }
}
