// The fleet's records in one place: which tables a command may write, how names resolve,
// and every read report as one SQL statement over the views in supabase/migrations.

// entity -> [table, label column, fields that add/set may write]
export const entities = {
  vehicle: ['vehicles', 'name', ['name', 'plate', 'vin', 'year', 'make', 'model', 'type', 'depot', 'country', 'status', 'fuel_type', 'gvm_kg', 'driver', 'purchase_date', 'purchase_price', 'currency']],
  driver: ['drivers', 'name', ['name', 'phone', 'email', 'licence_class', 'licence_expiry', 'active']],
  vendor: ['vendors', 'name', ['name', 'kind', 'phone', 'email']],
  program: ['service_programs', 'name', ['vehicle', 'name', 'interval_km', 'interval_days', 'last_done_on', 'last_done_km', 'reference', 'active']],
  part: ['parts', 'name', ['name', 'sku', 'reorder_at', 'unit_cost', 'currency', 'vendor']],
  renewal: ['renewals', 'kind', ['vehicle', 'kind', 'due_on', 'due_km', 'reference']],
  'work-order': ['work_orders', 'number', ['vendor', 'due_on', 'description', 'invoice_ref', 'tax']],
  issue: ['issues', 'title', ['title', 'priority', 'reported_by']],
};

// flag -> [column, entity it points at]
export const refs = { vehicle: ['vehicle_id', 'vehicle'], driver: ['driver_id', 'driver'], vendor: ['vendor_id', 'vendor'], program: ['program_id', 'program'] };
// flag -> column, amount entered in dollars and stored in cents
export const money = { purchase_price: 'purchase_price_cents', unit_cost: 'unit_cost_cents', tax: 'tax_cents', labour: 'labour_cents', parts: 'parts_cents' };

// Match an exact id or name first, then a partial id or a name fragment. Ambiguous lists the candidates.
export async function resolve(db, entity, value, scope = null) {
  const def = entities[entity];
  if (!def) throw Error(`Unknown record type ${entity}. Use ${Object.keys(entities).join(', ')}`);
  const [table, label] = def;
  const s = String(value ?? '').trim();
  if (!s) throw Error(`Name or id of the ${entity} is required`);
  const where = scope ? ' and vehicle_id = $2' : '';
  const params = scope ? [s, scope] : [s];
  let rows = await db.query(`select * from ${table} where (id::text = $1 or lower(${label}) = lower($1))${where}`, params);
  if (!rows.length) rows = await db.query(`select * from ${table} where (starts_with(id::text, lower($1)) or strpos(lower(${label}), lower($1)) > 0)${where} order by ${label}, id`, params);
  if (rows.length === 1) return rows[0];
  if (!rows.length) throw Error(`No ${entity} matches "${s}"`);
  throw Error(`Ambiguous ${entity} "${s}". Candidates:\n${rows.map((r) => `  ${r.id.slice(0, 8)}  ${r[label]}`).join('\n')}`);
}

const dollars = (c) => `round(${c} / 100.0, 2)`;

export const reports = {
  vehicles: `select v.name, v.plate, v.type, v.depot, v.country, v.status, v.odometer, v.meter_read_on, d.name driver
    from vehicles v left join drivers d on d.id = v.driver_id order by v.depot, v.name`,
  drivers: `select d.name, d.licence_class, d.licence_expiry, d.licence_expiry - fleet_today() days_left, d.active,
    (select string_agg(v.name, ', ' order by v.name) from vehicles v where v.driver_id = d.id) vehicles from drivers d order by d.name`,
  vendors: `select name, kind, phone, email from vendors order by kind, name`,
  'service-due': `select vehicle, service, state, due_km, km_left, due_on, days_left, booked from v_service_due
    where state <> 'ok' order by case state when 'overdue' then 0 else 1 end, least(coalesce(km_left, 999999), coalesce(days_left * 100, 999999))`,
  programs: `select vehicle, service, due_km, km_left, due_on, days_left, state from v_service_due order by vehicle, service`,
  renewals: `select vehicle, country, kind, due_on, days_left, due_km, km_left, state, reference from v_renewals
    where state <> 'ok' order by case state when 'expired' then 0 else 1 end, least(coalesce(days_left, 99999), coalesce(km_left / 50, 99999))`,
  issues: `select v.name vehicle, i.title, i.priority, fleet_today() - i.reported_on age_days, i.reported_by, w.number work_order
    from issues i join vehicles v on v.id = i.vehicle_id left join work_orders w on w.id = i.work_order_id
    where i.status = 'open' order by case i.priority when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end, i.reported_on`,
  'work-orders': `select number, vehicle, vendor, status, opened_on, due_on, age_days, quiet_days, currency, ${dollars('total_cents')} total, overdue
    from v_work_orders where status in ('open', 'in_progress', 'on_hold') order by overdue desc, opened_on`,
  history: `select number, vehicle, vendor, completed_on, description, currency, ${dollars('total_cents')} total
    from v_work_orders where status = 'completed' order by completed_on desc limit 30`,
  parts: `select p.name, p.sku, p.stock, p.reorder_at, p.currency, ${dollars('p.unit_cost_cents')} unit_cost, v.name vendor, p.stock <= p.reorder_at reorder
    from parts p left join vendors v on v.id = p.vendor_id order by (p.stock <= p.reorder_at) desc, p.name`,
  fuel: `select v.name vehicle, e.filled_on, e.litres, e.currency, ${dollars('e.total_cents')} total, e.odometer, e.partial, e.fuel_type, e.card, e.vendor
    from fuel_entries e join vehicles v on v.id = e.vehicle_id order by e.filled_on desc, v.name limit 40`,
  'fuel-economy': `select vehicle, filled_on, distance_km, litres, l_per_100km, usual_l_per_100km, card, unusual from v_fuel_economy order by unusual desc, vehicle, filled_on`,
  'fuel-check': `select vehicle, filled_on, 'unusual use' problem, l_per_100km || ' L/100km, usually ' || usual_l_per_100km detail, card from v_fuel_economy where unusual
    union all select vehicle, filled_on, problem, filled || ' into ' || vehicle_fuel, card from v_fuel_mismatches order by filled_on desc`,
  costs: `select vehicle, depot, currency, ${dollars('fuel_cents')} fuel, ${dollars('workshop_cents')} workshop, ${dollars('other_cents')} other,
    ${dollars('total_cents')} total, km, cents_per_km from v_costs order by currency, cents_per_km desc nulls last`,
  'replace-plan': `select vehicle, make_model, age_years, odometer, currency, ${dollars('workshop_12m_cents')} workshop_12m, serious_faults, signals
    from v_replace_plan order by signals desc, workshop_12m_cents desc`,
  'vendor-review': `select vendor, currency, count(*) filter (where status = 'completed') jobs_12m,
    ${dollars("avg(total_cents) filter (where status = 'completed')")} avg_job,
    round(avg(age_days) filter (where status = 'completed'), 1) avg_days, count(*) filter (where status in ('open', 'in_progress', 'on_hold')) open_now,
    count(*) filter (where overdue) overdue_now
    from v_work_orders where vendor is not null and (completed_on is null or completed_on > fleet_today() - 365) group by vendor, currency order by vendor`,
  'depot-review': `select v.depot, count(*) vehicles, count(*) filter (where v.status = 'in_workshop') in_workshop,
    (select count(*) from v_service_due d where d.depot = v.depot and d.state = 'overdue') services_overdue,
    (select count(*) from v_renewals r where r.depot = v.depot and r.state = 'expired') renewals_expired,
    (select count(*) from issues i join vehicles x on x.id = i.vehicle_id where x.depot = v.depot and i.status = 'open' and i.priority in ('high', 'critical')) serious_faults
    from vehicles v where v.status <> 'sold' group by v.depot order by v.depot`,
  attention: `select vehicle, reason, detail from v_attention order by reason, vehicle`,
  compliance: `select rule, vehicle, country, finding from v_compliance order by rule, vehicle`,
  activity: `select * from (select v.name vehicle, 'note' kind, n.note detail, n.created_at at_time from notes n join vehicles v on v.id = n.vehicle_id
    union all select '' vehicle, a.action, left(a.detail::text, 90), a.created_at from audit a) x order by at_time desc limit 30`,
};
