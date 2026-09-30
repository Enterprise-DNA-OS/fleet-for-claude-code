// Bring Fleetio history across from its CSV exports and import templates.
//   vehicles  the Vehicles index export or the Vehicle import template (name, vin, license_plate, current_meter, ...)
//   fuel      the Fuel Entries template (vehicle_name, date, volume, odometer, total_price, ...)
//   service   the Service Entries template (external_id, vehicle_name, completed_at, service_task, labor_subtotal, ...)
// A dry run by default: everything runs inside the caller's transaction, which rolls back unless --apply.
// Every original row is kept in import_rows and source_data. Running the same file twice adds nothing.
import fs from 'node:fs';
import { parseCsv, pick, yesNo } from './csv.mjs';

const MILE = 1.609344;
const VOLUME = { liters: 1, litres: 1, l: 1, us_gallons: 3.785411784, uk_gallons: 4.54609 };

function cents(v, what) {
  const s = String(v ?? '').replace(/[$,\s]/g, '');
  if (!s) return 0;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) throw Error(`${what}: "${v}" is not an amount`);
  return Math.round(n * 100);
}

function whole(v, what) {
  const s = String(v ?? '').replace(/[,\s]/g, '');
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) throw Error(`${what}: "${v}" is not a meter reading`);
  return n;
}

export function toDate(v, order, what) {
  const s = String(v ?? '').trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let y, mo, d;
  if (m) [, y, mo, d] = m.map(Number);
  else if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    y = Number(m[3]);
    let o = order;
    if (!o) { if (a > 12) o = 'dmy'; else if (b > 12) o = 'mdy'; else throw Error(`${what}: "${s}" could be day-first or month-first. Rerun with --date-order=dmy or --date-order=mdy`); }
    [d, mo] = o === 'dmy' ? [a, b] : [b, a];
  } else throw Error(`${what}: "${s}" is not a date`);
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) !== iso) throw Error(`${what}: "${s}" is not a real date`);
  return iso;
}

const vehicleType = (t) => {
  const s = String(t || '').toLowerCase();
  if (/pickup|pick-up|ute/.test(s)) return 'ute';
  if (/van/.test(s)) return 'van';
  if (/trailer/.test(s)) return 'trailer';
  if (/semi|tractor|heavy|prime mover/.test(s)) return 'heavy truck';
  if (/truck/.test(s)) return 'light truck';
  if (/car|sedan|suv|hatch|wagon/.test(s)) return 'car';
  if (/forklift|loader|excavator|equipment|generator|mower|plant/.test(s)) return 'plant';
  return 'other';
};
const vehicleStatus = (t) => {
  const s = String(t || '').toLowerCase();
  if (/shop|repair|workshop/.test(s)) return 'in_workshop';
  if (/sold|archiv|disposed/.test(s)) return 'sold';
  if (/out of service|inactive/.test(s)) return 'out_of_service';
  return 'active';
};
const vehicleFuel = (t) => {
  const s = String(t || '').toLowerCase();
  if (/diesel/.test(s)) return 'diesel';
  if (/plug/.test(s)) return 'plug-in hybrid';
  if (/hybrid/.test(s)) return 'petrol hybrid';
  if (/electric|ev\b/.test(s)) return 'electric';
  if (/gas|petrol|unleaded/.test(s)) return 'petrol';
  return s ? 'diesel' : 'diesel';
};
const fillFuel = (t, vehicle) => {
  const s = String(t || '').toLowerCase();
  if (/diesel/.test(s)) return 'diesel';
  if (/gas|petrol|unleaded/.test(s)) return 'petrol';
  if (!s) return vehicle.fuel_type === 'diesel' ? 'diesel' : vehicle.fuel_type.startsWith('petrol') ? 'petrol' : 'other';
  return 'other';
};

async function seen(db, entity, sourceId) {
  return (await db.query('select record_id from import_rows where entity = $1 and source_id = $2', [entity, sourceId]))[0]?.record_id || null;
}
async function remember(db, entity, sourceId, recordId, raw) {
  await db.query('insert into import_rows (entity, source_id, record_id, raw) values ($1, $2, $3, $4)', [entity, sourceId, recordId, JSON.stringify(raw)]);
}
async function vehicleFor(db, row, line) {
  const name = pick(row, 'vehicle_name', 'Vehicle Name', 'Vehicle', 'vehicle');
  const vin = pick(row, 'vehicle_vin', 'VIN', 'vin');
  const [v] = await db.query("select * from vehicles where (lower(name) = lower($1) and $1 <> '') or (vin = $2 and $2 <> '') limit 1", [name, vin]);
  if (!v) throw Error(`Row ${line}: vehicle "${name || vin}" is not in the database. Import vehicles first`);
  return v;
}
async function vendorId(db, name) {
  if (!name) return null;
  const [v] = await db.query('select id from vendors where lower(name) = lower($1)', [name]);
  if (v) return v.id;
  return (await db.query("insert into vendors (name, kind) values ($1, 'workshop') returning id", [name]))[0].id;
}

export async function importFleetio(db, kind, file, flags = {}) {
  if (!['vehicles', 'fuel', 'service'].includes(kind)) throw Error('Import one of: vehicles, fuel, service');
  if (!file || !fs.existsSync(file)) throw Error(`No file at ${file}`);
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const order = flags.date_order;
  if (order && !['dmy', 'mdy'].includes(order)) throw Error('--date-order must be dmy or mdy');
  const country = String(flags.country || 'NZ').toUpperCase();
  if (!['NZ', 'AU'].includes(country)) throw Error('--country must be NZ or AU');
  const currency = String(flags.currency || (country === 'AU' ? 'AUD' : 'NZD')).toUpperCase();
  const volumeUnit = String(flags.volume_unit || 'liters').toLowerCase();
  if (!VOLUME[volumeUnit]) throw Error('--volume-unit must be liters, us_gallons or uk_gallons');
  const out = { kind, mode: flags.apply ? 'applied' : 'dry-run', rows: rows.length, inserted: 0, existing: 0, converted_miles: 0, notes: [] };

  if (kind === 'vehicles') {
    for (const [i, row] of rows.entries()) {
      const line = i + 2;
      const name = pick(row, 'name', 'Name', 'Vehicle Name', 'Vehicle');
      if (!name) throw Error(`Row ${line}: vehicle name is required`);
      const sourceId = pick(row, 'fleetio_id', 'id', 'ID') || pick(row, 'vin', 'VIN') || name;
      if (await seen(db, 'vehicle', sourceId)) { out.existing++; continue; }
      const [already] = await db.query('select id from vehicles where lower(name) = lower($1)', [name]);
      if (already) { await remember(db, 'vehicle', sourceId, already.id, row); out.existing++; continue; }
      let meter = whole(pick(row, 'current_meter', 'Current Meter', 'Meter', 'Odometer'), `Row ${line} current_meter`) || 0;
      const unit = pick(row, 'meter_unit', 'Meter Unit').toLowerCase();
      if (/^mi/.test(unit)) { meter = Math.round(meter * MILE); out.converted_miles++; }
      const type = unit === 'hr' ? 'plant' : vehicleType(pick(row, 'type', 'Type', 'Vehicle Type'));
      const year = pick(row, 'year', 'Year');
      const bought = pick(row, 'purchase_price', 'Purchase Price');
      const [v] = await db.query(
        `insert into vehicles (name, plate, vin, year, make, model, type, depot, country, status, fuel_type, odometer, meter_read_on, purchase_date, purchase_price_cents, currency, external_id, source_data)
         values ($1, $2, nullif($3, ''), $4, $5, $6, $7, $8, $9, $10, $11, $12, case when $12 > 0 then fleet_today() end, $13, $14, $15, $16, $17) returning id`,
        [name, pick(row, 'license_plate', 'License Plate', 'Plate'), pick(row, 'vin', 'VIN'), year ? Number(year) : null,
          pick(row, 'make', 'Make'), pick(row, 'model', 'Model'), type, pick(row, 'group', 'Group', 'group_name') || String(flags.depot || ''), country,
          vehicleStatus(pick(row, 'status', 'Status', 'Vehicle Status')), vehicleFuel(pick(row, 'fuel_type', 'Fuel Type')), meter,
          toDate(pick(row, 'purchase_date', 'Purchase Date'), order, `Row ${line} purchase_date`), bought ? cents(bought, `Row ${line} purchase_price`) : null,
          currency, `fleetio:${sourceId}`, JSON.stringify(row)]);
      if (meter > 0) await db.query("insert into meter_readings (vehicle_id, value, source) values ($1, $2, 'fleetio import')", [v.id, meter]);
      await remember(db, 'vehicle', sourceId, v.id, row);
      out.inserted++;
    }
    if (out.converted_miles) out.notes.push(`${out.converted_miles} vehicle meter(s) converted from miles to km`);
    out.notes.push('Add WoF, CoF, rego and RUC renewals after import: Fleetio keeps these as renewal reminders, which are not in this export');
  }

  if (kind === 'fuel') {
    for (const [i, row] of rows.entries()) {
      const line = i + 2;
      const v = await vehicleFor(db, row, line);
      const date = toDate(pick(row, 'date', 'Date'), order, `Row ${line} date`);
      if (!date) throw Error(`Row ${line}: date is required`);
      const litres = Math.round(Number(String(pick(row, 'volume', 'Volume')).replace(/,/g, '')) * VOLUME[volumeUnit] * 100) / 100;
      if (!(litres > 0)) throw Error(`Row ${line}: volume must be more than zero`);
      let odo = whole(pick(row, 'odometer', 'Odometer', 'meter_value', 'Meter'), `Row ${line} odometer`);
      if (odo === null) throw Error(`Row ${line}: odometer is required`);
      if (flags.meter_unit === 'mi') { odo = Math.round(odo * MILE); out.converted_miles++; }
      const perUnit = pick(row, 'price_per_fuel_unit', 'Price Per Unit');
      const total = pick(row, 'total_price', 'Total', 'Total Price') ? cents(pick(row, 'total_price', 'Total', 'Total Price'), `Row ${line} total_price`)
        : Math.round(cents(perUnit, `Row ${line} price_per_fuel_unit`) * Number(pick(row, 'volume', 'Volume')));
      const sourceId = pick(row, 'id', 'ID', 'reference', 'Reference') ? `${v.id}:${pick(row, 'id', 'ID', 'reference', 'Reference')}` : `${v.id}:${date}:${odo}:${litres}`;
      if (await seen(db, 'fuel', sourceId)) { out.existing++; continue; }
      const [e] = await db.query(
        `insert into fuel_entries (vehicle_id, filled_on, litres, total_cents, odometer, partial, fuel_type, vendor, reference, currency, external_id, source_data)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning id`,
        [v.id, date, litres, total, odo, yesNo(pick(row, 'partial', 'Partial')), fillFuel(pick(row, 'fuel_type', 'Fuel Type'), v),
          pick(row, 'vendor', 'Vendor'), pick(row, 'reference', 'Reference'), currency, `fleetio:${sourceId}`, JSON.stringify(row)]);
      await db.query('update vehicles set odometer = $1, meter_read_on = $2 where id = $3 and odometer < $1', [odo, date, v.id]);
      await remember(db, 'fuel', sourceId, e.id, row);
      out.inserted++;
    }
    if (volumeUnit !== 'liters') out.notes.push(`volumes converted from ${volumeUnit} to litres`);
  }

  if (kind === 'service') {
    const groups = new Map();
    for (const [i, row] of rows.entries()) {
      const id = pick(row, 'external_id', 'External ID', 'id', 'ID');
      if (!id) throw Error(`Row ${i + 2}: external_id is required to group service lines`);
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push({ row, line: i + 2 });
    }
    for (const [id, items] of groups) {
      if (await seen(db, 'service', id)) { out.existing++; continue; }
      const { row: first, line } = items[0];
      const v = await vehicleFor(db, first, line);
      const done = toDate(pick(first, 'completed_at', 'Completed At', 'Date'), order, `Row ${line} completed_at`);
      if (!done) throw Error(`Row ${line}: completed_at is required`);
      let odo = whole(pick(first, 'meter_value', 'Meter Value', 'Odometer'), `Row ${line} meter_value`);
      if (odo !== null && flags.meter_unit === 'mi') { odo = Math.round(odo * MILE); out.converted_miles++; }
      const tax = cents(pick(first, 'tax1', 'Tax'), `Row ${line} tax1`) + cents(pick(first, 'tax2'), `Row ${line} tax2`);
      const [w] = await db.query(
        `insert into work_orders (number, vehicle_id, vendor_id, status, opened_on, completed_on, odometer, description, invoice_ref, tax_cents, currency, external_id, source_data)
         values ($1, $2, $3, 'completed', $4, $4, $5, $6, $7, $8, $9, $10, $11) returning id`,
        [`FLT-${id}`, v.id, await vendorId(db, pick(first, 'vendor', 'Vendor')), done, odo, pick(first, 'general_notes', 'Notes') || 'Imported Fleetio service entry',
          pick(first, 'reference', 'Reference'), tax, currency, `fleetio:${id}`, JSON.stringify(items.map((x) => x.row))]);
      for (const { row, line: l } of items) {
        const task = pick(row, 'service_task', 'Service Task') || 'Service';
        const [program] = await db.query('select id from service_programs where vehicle_id = $1 and lower(name) = lower($2)', [v.id, task]);
        const labour = cents(pick(row, 'labor_subtotal', 'Labor'), `Row ${l} labor_subtotal`);
        let parts = cents(pick(row, 'parts_subtotal', 'Parts'), `Row ${l} parts_subtotal`);
        if (!labour && !parts) parts = cents(pick(row, 'line_item_subtotal', 'Subtotal'), `Row ${l} line_item_subtotal`);
        await db.query('insert into work_order_lines (work_order_id, task, program_id, labour_cents, parts_cents, notes) values ($1, $2, $3, $4, $5, $6)',
          [w.id, task, program?.id || null, labour, parts, pick(row, 'line_item_notes')]);
        if (program) await db.query('update service_programs set last_done_on = $1, last_done_km = coalesce($2, last_done_km) where id = $3 and (last_done_on is null or last_done_on <= $1)', [done, odo, program.id]);
      }
      if (odo !== null) await db.query('update vehicles set odometer = $1, meter_read_on = $2 where id = $3 and odometer < $1', [odo, done, v.id]);
      await remember(db, 'service', id, w.id, items.map((x) => x.row));
      out.inserted++;
    }
    out.notes.push('A line total with no labour and parts split is recorded as parts');
  }
  if (!flags.apply) out.notes.push('Dry run: nothing saved. Rerun with --apply once the counts look right');
  return [out];
}
