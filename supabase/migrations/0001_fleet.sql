-- Fleet for Claude Code: vehicles, meters, service programs, faults, work orders,
-- parts, fuel, running costs and renewals (WoF, CoF, rego, RUC, AU inspections).
-- Plain Postgres. Runs the same on hosted Postgres and embedded PGlite.

create table settings (
  id integer primary key default 1 check (id = 1),
  business_name text not null default 'Your fleet',
  timezone text not null default 'Pacific/Auckland',
  due_soon_km integer not null default 1000 check (due_soon_km >= 0),
  due_soon_days integer not null default 14 check (due_soon_days >= 0),
  renewal_days integer not null default 30 check (renewal_days >= 0),
  quiet_days integer not null default 7 check (quiet_days > 0),
  stale_reading_days integer not null default 30 check (stale_reading_days > 0)
);
insert into settings (id) values (1);

-- The fleet's own calendar day, not the server's.
create function fleet_today() returns date language sql stable as $$
  select (now() at time zone coalesce((select timezone from settings where id = 1), 'Pacific/Auckland'))::date
$$;

create table drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (trim(name) <> ''),
  phone text not null default '',
  email text not null default '',
  licence_class text not null default '',
  licence_expiry date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (trim(name) <> ''),
  kind text not null default 'workshop' check (kind in ('workshop', 'tyres', 'dealer', 'fuel', 'parts', 'other')),
  phone text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (trim(name) <> ''),
  plate text not null default '',
  vin text,
  year integer check (year between 1950 and 2100),
  make text not null default '',
  model text not null default '',
  type text not null default 'van' check (type in ('car', 'ute', 'van', 'light truck', 'heavy truck', 'trailer', 'plant', 'other')),
  depot text not null default '',
  country text not null default 'NZ' check (country in ('NZ', 'AU')),
  status text not null default 'active' check (status in ('active', 'in_workshop', 'out_of_service', 'sold')),
  fuel_type text not null default 'diesel' check (fuel_type in ('diesel', 'petrol', 'petrol hybrid', 'plug-in hybrid', 'electric', 'none')),
  gvm_kg integer check (gvm_kg > 0),
  odometer integer not null default 0 check (odometer >= 0),
  meter_read_on date,
  driver_id uuid references drivers(id),
  purchase_date date,
  purchase_price_cents bigint check (purchase_price_cents >= 0),
  currency text not null default 'NZD' check (currency in ('NZD', 'AUD')),
  external_id text unique,
  source_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index vehicles_vin on vehicles (vin) where vin is not null and vin <> '';

create table meter_readings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  read_on date not null default fleet_today(),
  value integer not null check (value >= 0),
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A service program is one recurring job on one vehicle: every N km, every N days, or both, whichever comes first.
create table service_programs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  name text not null check (trim(name) <> ''),
  interval_km integer check (interval_km > 0),
  interval_days integer check (interval_days > 0),
  last_done_on date,
  last_done_km integer check (last_done_km >= 0),
  reference text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vehicle_id, name),
  check (interval_km is not null or interval_days is not null)
);

create table work_orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  vehicle_id uuid not null references vehicles(id),
  vendor_id uuid references vendors(id),
  status text not null default 'open' check (status in ('open', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  opened_on date not null default fleet_today(),
  due_on date,
  completed_on date,
  odometer integer check (odometer >= 0),
  description text not null default '',
  invoice_ref text not null default '',
  tax_cents bigint not null default 0 check (tax_cents >= 0),
  currency text not null default 'NZD' check (currency in ('NZD', 'AUD')),
  external_id text unique,
  source_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'completed') = (completed_on is not null))
);

create table work_order_lines (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id),
  task text not null check (trim(task) <> ''),
  program_id uuid references service_programs(id),
  labour_cents bigint not null default 0 check (labour_cents >= 0),
  parts_cents bigint not null default 0 check (parts_cents >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table issues (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  title text not null check (trim(title) <> ''),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  reported_on date not null default fleet_today(),
  reported_by text not null default '',
  work_order_id uuid references work_orders(id),
  resolved_on date,
  resolution text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'resolved') = (resolved_on is not null))
);

create table parts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (trim(name) <> ''),
  sku text unique,
  stock numeric(12, 2) not null default 0 check (stock >= 0),
  reorder_at numeric(12, 2) not null default 0 check (reorder_at >= 0),
  unit_cost_cents bigint not null default 0 check (unit_cost_cents >= 0),
  currency text not null default 'NZD' check (currency in ('NZD', 'AUD')),
  vendor_id uuid references vendors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table part_uses (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id),
  part_id uuid not null references parts(id),
  quantity numeric(12, 2) not null check (quantity > 0),
  unit_cost_cents bigint not null check (unit_cost_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table fuel_entries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  filled_on date not null default fleet_today(),
  litres numeric(10, 2) not null check (litres > 0),
  total_cents bigint not null check (total_cents >= 0),
  odometer integer not null check (odometer >= 0),
  partial boolean not null default false,
  fuel_type text not null default 'diesel' check (fuel_type in ('diesel', 'petrol', 'other')),
  vendor text not null default '',
  card text not null default '',
  reference text not null default '',
  currency text not null default 'NZD' check (currency in ('NZD', 'AUD')),
  external_id text unique,
  source_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  kind text not null check (kind in ('registration', 'ruc', 'insurance', 'tolls', 'tyres', 'fines', 'other')),
  spent_on date not null default fleet_today(),
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'NZD' check (currency in ('NZD', 'AUD')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Renewals are dated (WoF, CoF, rego, insurance, AU inspection) or distance-based (an NZ RUC licence ends at an odometer reading).
create table renewals (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  kind text not null check (kind in ('wof', 'cof', 'registration', 'ruc', 'au_inspection', 'insurance', 'other')),
  due_on date,
  due_km integer check (due_km >= 0),
  done_on date,
  reference text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_on is not null or due_km is not null)
);
create unique index renewals_one_open on renewals (vehicle_id, kind) where done_on is null;

create table notes (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  note text not null check (trim(note) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table audit (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  record_id uuid,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table import_rows (
  entity text not null,
  source_id text not null,
  record_id uuid not null,
  raw jsonb not null,
  created_at timestamptz not null default now(),
  primary key (entity, source_id)
);

create function stamp() returns trigger language plpgsql as $$
begin new.updated_at = clock_timestamp(); return new; end $$;

do $$ declare t text; begin
  foreach t in array array['drivers', 'vendors', 'vehicles', 'meter_readings', 'service_programs', 'work_orders', 'work_order_lines',
                           'issues', 'parts', 'part_uses', 'fuel_entries', 'expenses', 'renewals', 'notes'] loop
    execute format('create trigger stamp before update on %I for each row execute function stamp()', t);
  end loop;
end $$;

-- ------------------------------------------------------------------ views

create view v_service_due as
with d as (
  select p.id, p.vehicle_id, v.name vehicle, v.depot, p.name service, v.odometer,
    case when p.interval_km is not null then coalesce(p.last_done_km, 0) + p.interval_km end due_km,
    case when p.interval_days is not null then coalesce(p.last_done_on, v.created_at::date) + p.interval_days end due_on,
    exists (select 1 from work_order_lines l join work_orders w on w.id = l.work_order_id
            where l.program_id = p.id and w.status in ('open', 'in_progress', 'on_hold')) booked
  from service_programs p join vehicles v on v.id = p.vehicle_id
  where p.active and v.status <> 'sold'
)
select d.*, d.due_km - d.odometer km_left, d.due_on - fleet_today() days_left,
  case when d.due_km - d.odometer <= 0 or d.due_on - fleet_today() <= 0 then 'overdue'
       when d.due_km - d.odometer <= s.due_soon_km or d.due_on - fleet_today() <= s.due_soon_days then 'due soon'
       else 'ok' end state
from d cross join settings s;

create view v_renewals as
select r.id, r.vehicle_id, v.name vehicle, v.depot, v.country, r.kind, r.due_on, r.due_km, v.odometer,
  r.due_on - fleet_today() days_left, r.due_km - v.odometer km_left, r.reference,
  case when r.due_on < fleet_today() or r.due_km <= v.odometer then 'expired'
       when r.due_on - fleet_today() <= s.renewal_days or r.due_km - v.odometer <= s.due_soon_km then 'due soon'
       else 'ok' end state
from renewals r join vehicles v on v.id = r.vehicle_id cross join settings s
where r.done_on is null and v.status <> 'sold';

create view v_work_orders as
select w.id, w.number, w.vehicle_id, v.name vehicle, v.depot, vd.name vendor, w.status, w.description,
  w.opened_on, w.due_on, w.completed_on, w.currency,
  coalesce(l.labour, 0) labour_cents,
  coalesce(l.parts, 0) + coalesce(pu.parts, 0) parts_cents,
  coalesce(l.labour, 0) + coalesce(l.parts, 0) + coalesce(pu.parts, 0) + w.tax_cents total_cents,
  coalesce(w.completed_on, fleet_today()) - w.opened_on age_days,
  fleet_today() - (w.updated_at at time zone s.timezone)::date quiet_days,
  (w.due_on < fleet_today() and w.status in ('open', 'in_progress', 'on_hold')) overdue
from work_orders w join vehicles v on v.id = w.vehicle_id left join vendors vd on vd.id = w.vendor_id cross join settings s
left join (select work_order_id, sum(labour_cents) labour, sum(parts_cents) parts from work_order_lines group by work_order_id) l on l.work_order_id = w.id
left join (select work_order_id, round(sum(quantity * unit_cost_cents))::bigint parts from part_uses group by work_order_id) pu on pu.work_order_id = w.id;

-- Litres per 100 km, full tank to full tank, partial fills counted into the next full one.
create view v_fuel_economy as
with fulls as (
  select e.*, lag(e.odometer) over (partition by e.vehicle_id order by e.odometer, e.filled_on, e.id) prev_full_km
  from fuel_entries e where not e.partial
), legs as (
  select f.id, f.vehicle_id, f.filled_on, f.odometer, f.card, f.vendor, f.fuel_type, f.odometer - f.prev_full_km distance_km,
    (select sum(x.litres) from fuel_entries x where x.vehicle_id = f.vehicle_id and x.odometer > f.prev_full_km and x.odometer <= f.odometer) litres
  from fulls f where f.prev_full_km is not null and f.odometer > f.prev_full_km
), rated as (
  select l.*, round(l.litres * 100 / l.distance_km, 1) l_per_100km,
    count(*) over (partition by l.vehicle_id) legs_n,
    sum(l.litres * 100 / l.distance_km) over (partition by l.vehicle_id) rate_sum
  from legs l
)
select r.id, r.vehicle_id, v.name vehicle, r.filled_on, r.odometer, r.distance_km, r.litres, r.l_per_100km,
  case when r.legs_n > 2 then round((r.rate_sum - r.litres * 100 / r.distance_km) / (r.legs_n - 1), 1) end usual_l_per_100km,
  r.card, r.vendor,
  (r.legs_n > 2 and r.litres * 100 / r.distance_km > 1.25 * (r.rate_sum - r.litres * 100 / r.distance_km) / (r.legs_n - 1)) unusual
from rated r join vehicles v on v.id = r.vehicle_id;

-- Fills that do not match the vehicle: wrong fuel, or an odometer lower than the last fill.
create view v_fuel_mismatches as
select e.id, v.name vehicle, e.filled_on, e.fuel_type filled, v.fuel_type vehicle_fuel, e.card, e.litres, 'wrong fuel for this vehicle' problem
from fuel_entries e join vehicles v on v.id = e.vehicle_id
where (v.fuel_type = 'diesel' and e.fuel_type = 'petrol') or (v.fuel_type in ('petrol', 'petrol hybrid') and e.fuel_type = 'diesel') or v.fuel_type = 'electric';

-- Everything a vehicle cost in the last 365 days, per currency, against the distance it travelled.
create view v_costs as
with spend as (
  select vehicle_id, currency, total_cents fuel, 0::bigint workshop, 0::bigint other from fuel_entries where filled_on > fleet_today() - 365
  union all select vehicle_id, currency, 0, total_cents, 0 from v_work_orders where status = 'completed' and completed_on > fleet_today() - 365
  union all select vehicle_id, currency, 0, 0, amount_cents from expenses where spent_on > fleet_today() - 365
), km as (
  select vehicle_id, max(value) - min(value) km from (
    select vehicle_id, value from meter_readings where read_on > fleet_today() - 365
    union all select vehicle_id, odometer from fuel_entries where filled_on > fleet_today() - 365
  ) m group by vehicle_id
)
select v.id vehicle_id, v.name vehicle, v.depot, s.currency, sum(s.fuel) fuel_cents, sum(s.workshop) workshop_cents, sum(s.other) other_cents,
  sum(s.fuel + s.workshop + s.other) total_cents, coalesce(km.km, 0) km,
  case when coalesce(km.km, 0) > 0 then round(sum(s.fuel + s.workshop + s.other)::numeric / km.km, 1) end cents_per_km
from spend s join vehicles v on v.id = s.vehicle_id left join km on km.vehicle_id = v.id
group by v.id, v.name, v.depot, s.currency, km.km;

create view v_replace_plan as
select v.id vehicle_id, v.name vehicle, v.depot, v.make || ' ' || v.model make_model, v.year,
  extract(year from fleet_today())::int - v.year age_years, v.odometer, v.currency,
  coalesce(c.workshop_cents, 0) workshop_12m_cents, v.purchase_price_cents,
  (select count(*) from issues i where i.vehicle_id = v.id and i.status = 'open' and i.priority in ('high', 'critical')) serious_faults,
  (case when extract(year from fleet_today())::int - v.year >= 8 then 1 else 0 end
   + case when v.odometer >= 300000 then 1 else 0 end
   + case when v.purchase_price_cents > 0 and coalesce(c.workshop_cents, 0) > v.purchase_price_cents * 0.15 then 1 else 0 end
   + case when (select count(*) from work_orders w where w.vehicle_id = v.id and w.opened_on > fleet_today() - 365) >= 4 then 1 else 0 end) signals
from vehicles v left join v_costs c on c.vehicle_id = v.id and c.currency = v.currency
where v.status <> 'sold';

create view v_compliance as
select v.name vehicle, v.country, 'NZ-WOF-COF' rule,
  case when r.id is null then 'No open WoF or CoF record' else upper(r.kind) || ' expired ' || r.due_on end finding
from vehicles v left join v_renewals r on r.vehicle_id = v.id and r.kind in ('wof', 'cof')
where v.country = 'NZ' and v.status in ('active', 'in_workshop') and v.type <> 'plant' and (r.id is null or r.state = 'expired')
union all
select v.name, v.country, 'NZ-LICENCE', case when r.id is null then 'No open vehicle licence (rego) record' else 'Vehicle licence expired ' || r.due_on end
from vehicles v left join v_renewals r on r.vehicle_id = v.id and r.kind = 'registration'
where v.country = 'NZ' and v.status in ('active', 'in_workshop') and v.type <> 'plant' and (r.id is null or r.state = 'expired')
union all
select v.name, v.country, 'NZ-RUC',
  case when r.id is null then 'Pays road user charges but has no open RUC licence record' else 'Odometer ' || v.odometer || ' km is past the RUC licence end of ' || r.due_km || ' km' end
from vehicles v left join v_renewals r on r.vehicle_id = v.id and r.kind = 'ruc'
where v.country = 'NZ' and v.status in ('active', 'in_workshop') and v.type not in ('plant', 'trailer')
  and (v.fuel_type in ('diesel', 'electric', 'plug-in hybrid') or v.gvm_kg > 3500) and (r.id is null or r.due_km <= v.odometer)
union all
select v.name, v.country, 'AU-REGISTRATION', case when r.id is null then 'No open registration record' else 'Registration expired ' || r.due_on end
from vehicles v left join v_renewals r on r.vehicle_id = v.id and r.kind = 'registration'
where v.country = 'AU' and v.status in ('active', 'in_workshop') and v.type <> 'plant' and (r.id is null or r.state = 'expired')
union all
select v.name, v.country, 'AU-HVNL-MAINTENANCE',
  case when not exists (select 1 from work_orders w where w.vehicle_id = v.id and w.status = 'completed' and w.completed_on > fleet_today() - 365)
       then 'Heavy vehicle with no completed maintenance record in 12 months' else 'Heavy vehicle with an overdue service program' end
from vehicles v
where v.country = 'AU' and v.status = 'active' and v.gvm_kg > 4500
  and (not exists (select 1 from work_orders w where w.vehicle_id = v.id and w.status = 'completed' and w.completed_on > fleet_today() - 365)
       or exists (select 1 from v_service_due d where d.vehicle_id = v.id and d.state = 'overdue'))
union all
select v.name, v.country, 'CRITICAL-FAULT', 'Open critical fault on a vehicle marked active: ' || i.title
from issues i join vehicles v on v.id = i.vehicle_id where i.status = 'open' and i.priority = 'critical' and v.status = 'active'
union all
select v.name, v.country, 'DRIVER-LICENCE', coalesce(d.name, '') || ': licence expiry missing or passed'
from vehicles v join drivers d on d.id = v.driver_id where v.status = 'active' and (d.licence_expiry is null or d.licence_expiry < fleet_today());

create view v_attention as
select vehicle, 'service ' || state reason, service || coalesce(' (' || km_left || ' km left)', '') detail from v_service_due where state = 'overdue' and not booked
union all select vehicle, 'renewal ' || state, upper(kind) || coalesce(' due ' || due_on, '') || coalesce(' at ' || due_km || ' km', '') from v_renewals where state <> 'ok'
union all select v.name, 'fault with no work order', i.priority || ': ' || i.title || ' (' || (fleet_today() - i.reported_on) || ' days)'
  from issues i join vehicles v on v.id = i.vehicle_id where i.status = 'open' and i.work_order_id is null and (i.priority in ('high', 'critical') or fleet_today() - i.reported_on > (select quiet_days from settings))
union all select vehicle, 'work order ' || case when overdue then 'overdue' when status = 'on_hold' then 'on hold' else 'quiet' end,
  number || ' at ' || coalesce(vendor, 'in house') || ', ' || quiet_days || ' days since an update'
  from v_work_orders where status in ('open', 'in_progress', 'on_hold') and (overdue or status = 'on_hold' or quiet_days >= (select quiet_days from settings))
union all select name, 'odometer stale', coalesce('last reading ' || meter_read_on, 'no reading on record')
  from vehicles where status = 'active' and type not in ('trailer') and (meter_read_on is null or meter_read_on < fleet_today() - (select stale_reading_days from settings))
union all select vehicle, 'unusual fuel use', l_per_100km || ' L/100km against a usual ' || usual_l_per_100km || ' on ' || filled_on || coalesce(' card ' || nullif(card, ''), '') from v_fuel_economy where unusual
union all select vehicle, 'fuel mismatch', filled || ' into a ' || vehicle_fuel || ' vehicle on ' || filled_on || coalesce(' card ' || nullif(card, ''), '') from v_fuel_mismatches
union all select name, 'driver licence', case when licence_expiry is null then 'Licence expiry not recorded' when licence_expiry < fleet_today() then 'Licence expired ' || licence_expiry else 'Licence expires ' || licence_expiry end
  from drivers where active and (licence_expiry is null or licence_expiry <= fleet_today() + (select renewal_days from settings))
union all select name, 'part below reorder level', stock || ' in stock, reorder at ' || reorder_at from parts where stock <= reorder_at and reorder_at > 0;
