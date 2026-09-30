-- Demo fleet: Totara Services, a fictional plumbing and drainage business with depots in
-- Auckland, Hamilton and Brisbane. Dates are relative to today, so something is always
-- overdue, expiring or quiet. Safe to run twice.

update settings set business_name = 'Totara Services (demo)' where id = 1 and business_name = 'Your fleet';

insert into drivers (id, name, phone, licence_class, licence_expiry) values
 ('20000000-0000-4000-8000-000000000001', 'Aroha King', '021 555 0101', '1', fleet_today() + 900),
 ('20000000-0000-4000-8000-000000000002', 'Ben Murray', '021 555 0102', '2', fleet_today() - 6),
 ('20000000-0000-4000-8000-000000000003', 'Ben Miller', '0400 555 103', 'MR', fleet_today() + 400),
 ('20000000-0000-4000-8000-000000000004', 'Priya Nair', '0400 555 104', 'HR', fleet_today() + 21),
 ('20000000-0000-4000-8000-000000000005', 'Tom Walker', '021 555 0105', '1', fleet_today() + 1200)
on conflict do nothing;

insert into vendors (id, name, kind, phone, email) values
 ('30000000-0000-4000-8000-000000000001', 'Onehunga Diesel', 'workshop', '09 555 0201', 'bookings@onehunga-diesel.example'),
 ('30000000-0000-4000-8000-000000000002', 'Waikato Truck Services', 'workshop', '07 555 0202', 'service@waikato-truck.example'),
 ('30000000-0000-4000-8000-000000000003', 'Northside Tyres', 'tyres', '09 555 0203', 'shop@northside-tyres.example'),
 ('30000000-0000-4000-8000-000000000004', 'Brisbane Fleet Mechanical', 'workshop', '07 3555 0204', 'jobs@bfm.example')
on conflict do nothing;

insert into vehicles (id, name, plate, vin, year, make, model, type, depot, country, status, fuel_type, gvm_kg, odometer, meter_read_on, driver_id, purchase_date, purchase_price_cents, currency) values
 ('10000000-0000-4000-8000-000000000001', 'TS-01 Hilux', 'PLM101', 'DEMOVIN0000000001', 2021, 'Toyota', 'Hilux SR', 'ute', 'Auckland', 'NZ', 'active', 'diesel', 3050, 184200, fleet_today() - 2, '20000000-0000-4000-8000-000000000001', '2021-03-15', 5890000, 'NZD'),
 ('10000000-0000-4000-8000-000000000002', 'TS-02 Hiace', 'PLM102', 'DEMOVIN0000000002', 2020, 'Toyota', 'Hiace ZR', 'van', 'Auckland', 'NZ', 'active', 'diesel', 3300, 96400, fleet_today() - 5, '20000000-0000-4000-8000-000000000002', '2020-08-01', 5200000, 'NZD'),
 ('10000000-0000-4000-8000-000000000003', 'TS-03 Isuzu NPR', 'PLM103', 'DEMOVIN0000000003', 2018, 'Isuzu', 'NPR 75-190', 'light truck', 'Hamilton', 'NZ', 'in_workshop', 'diesel', 7500, 311650, fleet_today() - 3, null, '2018-05-20', 8400000, 'NZD'),
 ('10000000-0000-4000-8000-000000000004', 'TS-04 Ranger', '123ABC', 'DEMOVIN0000000004', 2022, 'Ford', 'Ranger XL', 'ute', 'Brisbane', 'AU', 'active', 'diesel', 3280, 128000, fleet_today() - 1, '20000000-0000-4000-8000-000000000003', '2022-02-10', 5600000, 'AUD'),
 ('10000000-0000-4000-8000-000000000005', 'TS-05 Hino 500', '456DEF', 'DEMOVIN0000000005', 2016, 'Hino', '500 FD', 'heavy truck', 'Brisbane', 'AU', 'active', 'diesel', 16000, 402300, fleet_today() - 1, '20000000-0000-4000-8000-000000000004', '2016-09-01', 14500000, 'AUD'),
 ('10000000-0000-4000-8000-000000000006', 'TS-06 Corolla', 'PLM106', 'DEMOVIN0000000006', 2023, 'Toyota', 'Corolla GX Hybrid', 'car', 'Auckland', 'NZ', 'active', 'petrol hybrid', null, 61000, fleet_today() - 45, '20000000-0000-4000-8000-000000000005', '2023-04-01', 3900000, 'NZD'),
 ('10000000-0000-4000-8000-000000000007', 'TS-07 Old Hiace', 'GHK207', 'DEMOVIN0000000007', 2012, 'Toyota', 'Hiace LWB', 'van', 'Hamilton', 'NZ', 'active', 'diesel', 3300, 412000, fleet_today() - 4, null, '2012-06-01', 4100000, 'NZD')
on conflict do nothing;

insert into meter_readings (id, vehicle_id, read_on, value, source) values
 ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', fleet_today() - 360, 151000, 'manual'),
 ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', fleet_today() - 2, 184200, 'manual'),
 ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', fleet_today() - 350, 71400, 'manual'),
 ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', fleet_today() - 5, 96400, 'manual'),
 ('40000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003', fleet_today() - 355, 283650, 'manual'),
 ('40000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000003', fleet_today() - 3, 311650, 'manual'),
 ('40000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000004', fleet_today() - 340, 96000, 'manual'),
 ('40000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000004', fleet_today() - 1, 128000, 'manual'),
 ('40000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000005', fleet_today() - 358, 342300, 'manual'),
 ('40000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000005', fleet_today() - 1, 402300, 'manual'),
 ('40000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000006', fleet_today() - 45, 61000, 'manual'),
 ('40000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000007', fleet_today() - 362, 385000, 'manual'),
 ('40000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000007', fleet_today() - 4, 412000, 'manual')
on conflict do nothing;

insert into service_programs (id, vehicle_id, name, interval_km, interval_days, last_done_on, last_done_km, reference) values
 ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'A service (oil and filters)', 10000, 180, fleet_today() - 120, 172900, 'Toyota Hilux owner manual, severe use'),
 ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'A service (oil and filters)', 15000, 365, fleet_today() - 150, 88000, 'Toyota Hiace owner manual'),
 ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'B service and brake inspection', 20000, 365, fleet_today() - 200, 300000, 'Isuzu N Series maintenance schedule'),
 ('50000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'A service (oil and filters)', 15000, 365, fleet_today() - 355, 119000, 'Ford Ranger scheduled service'),
 ('50000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', 'Heavy service and brake check', 25000, 182, fleet_today() - 200, 385000, 'Hino maintenance schedule; operator policy 6 monthly'),
 ('50000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000006', 'Annual service', 15000, 365, fleet_today() - 100, 52000, 'Toyota Service Advantage'),
 ('50000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000007', 'A service (oil and filters)', 10000, 180, fleet_today() - 60, 405000, 'Toyota Hiace owner manual')
on conflict do nothing;

insert into renewals (id, vehicle_id, kind, due_on, due_km, reference) values
 ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'wof', fleet_today() - 5, null, 'WoF label PLM101'),
 ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'registration', fleet_today() + 40, null, 'Licence 12 months'),
 ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'ruc', null, 184900, 'RUC licence type 2'),
 ('60000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'wof', fleet_today() + 120, null, ''),
 ('60000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 'registration', fleet_today() + 12, null, ''),
 ('60000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000002', 'ruc', null, 99000, ''),
 ('60000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000003', 'cof', fleet_today() + 20, null, 'CoF 6 monthly'),
 ('60000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000003', 'registration', fleet_today() + 200, null, ''),
 ('60000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000003', 'ruc', null, 312000, 'RUC heavy'),
 ('60000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000004', 'registration', fleet_today() - 2, null, 'QLD rego'),
 ('60000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000005', 'registration', fleet_today() + 90, null, 'QLD heavy rego'),
 ('60000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000005', 'insurance', fleet_today() + 18, null, 'Policy HV-2231'),
 ('60000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000006', 'wof', fleet_today() + 200, null, ''),
 ('60000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000006', 'registration', fleet_today() + 150, null, ''),
 ('60000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000007', 'wof', fleet_today() + 60, null, ''),
 ('60000000-0000-4000-8000-000000000016', '10000000-0000-4000-8000-000000000007', 'registration', fleet_today() + 75, null, ''),
 ('60000000-0000-4000-8000-000000000017', '10000000-0000-4000-8000-000000000007', 'ruc', null, 420000, '')
on conflict do nothing;

insert into work_orders (id, number, vehicle_id, vendor_id, status, opened_on, due_on, completed_on, odometer, description, invoice_ref, tax_cents, currency, updated_at) values
 ('70000000-0000-4000-8000-000000000001', 'WO-1001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'completed', fleet_today() - 122, fleet_today() - 120, fleet_today() - 120, 172900, 'A service', 'OD-5521', 5850, 'NZD', now() - interval '30 days'),
 ('70000000-0000-4000-8000-000000000002', 'WO-1002', '10000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000002', 'completed', fleet_today() - 240, fleet_today() - 230, fleet_today() - 228, 395000, 'Clutch replacement', 'WTS-883', 34500, 'NZD', now() - interval '30 days'),
 ('70000000-0000-4000-8000-000000000003', 'WO-1003', '10000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000002', 'completed', fleet_today() - 140, fleet_today() - 135, fleet_today() - 130, 401000, 'Injector repair', 'WTS-941', 25500, 'NZD', now() - interval '30 days'),
 ('70000000-0000-4000-8000-000000000004', 'WO-1004', '10000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000002', 'completed', fleet_today() - 62, fleet_today() - 60, fleet_today() - 60, 405000, 'A service and front brake pads', 'WTS-1010', 9750, 'NZD', now() - interval '30 days'),
 ('70000000-0000-4000-8000-000000000005', 'WO-1005', '10000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000003', 'completed', fleet_today() - 30, fleet_today() - 30, fleet_today() - 29, 409500, 'Four tyres', 'NT-3301', 13200, 'NZD', now() - interval '30 days'),
 ('70000000-0000-4000-8000-000000000006', 'WO-1006', '10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'on_hold', fleet_today() - 10, fleet_today() - 3, null, 96200, 'Sliding door latch sticking; waiting on part', '', 0, 'NZD', now() - interval '9 days'),
 ('70000000-0000-4000-8000-000000000007', 'WO-1007', '10000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 'in_progress', fleet_today() - 2, fleet_today() + 1, null, 311650, 'Brakes pulling left under load', '', 0, 'NZD', now() - interval '1 days'),
 ('70000000-0000-4000-8000-000000000008', 'WO-1008', '10000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 'completed', fleet_today() - 356, fleet_today() - 355, fleet_today() - 355, 119000, 'A service', 'BFM-201', 4200, 'AUD', now() - interval '30 days'),
 ('70000000-0000-4000-8000-000000000009', 'WO-1009', '10000000-0000-4000-8000-000000000006', null, 'completed', fleet_today() - 100, fleet_today() - 100, fleet_today() - 100, 52000, 'Annual service (dealer plan)', 'TSA-77', 0, 'NZD', now() - interval '30 days')
on conflict do nothing;

insert into work_order_lines (id, work_order_id, task, program_id, labour_cents, parts_cents) values
 ('71000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'A service (oil and filters)', '50000000-0000-4000-8000-000000000001', 18000, 21000),
 ('71000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000002', 'Clutch kit and flywheel machining', null, 96000, 134000),
 ('71000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000003', 'Injector recondition (4)', null, 42000, 128000),
 ('71000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000004', 'A service (oil and filters)', '50000000-0000-4000-8000-000000000007', 16000, 19000),
 ('71000000-0000-4000-8000-000000000005', '70000000-0000-4000-8000-000000000004', 'Front brake pads', null, 12000, 18000),
 ('71000000-0000-4000-8000-000000000006', '70000000-0000-4000-8000-000000000005', 'Four light truck tyres fitted and balanced', null, 8000, 80000),
 ('71000000-0000-4000-8000-000000000007', '70000000-0000-4000-8000-000000000006', 'Sliding door latch', null, 0, 0),
 ('71000000-0000-4000-8000-000000000008', '70000000-0000-4000-8000-000000000007', 'Diagnose brake pull', null, 0, 0),
 ('71000000-0000-4000-8000-000000000009', '70000000-0000-4000-8000-000000000008', 'A service (oil and filters)', '50000000-0000-4000-8000-000000000004', 16000, 12000),
 ('71000000-0000-4000-8000-000000000010', '70000000-0000-4000-8000-000000000009', 'Annual service', '50000000-0000-4000-8000-000000000006', 0, 0)
on conflict do nothing;

insert into issues (id, vehicle_id, title, priority, status, reported_on, reported_by, work_order_id) values
 ('80000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'Brakes pull left under load', 'critical', 'open', fleet_today() - 2, 'Tom Walker', '70000000-0000-4000-8000-000000000007'),
 ('80000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000005', 'Air leak at rear brake chamber, audible when parked', 'high', 'open', fleet_today() - 12, 'Priya Nair', null),
 ('80000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Tow bar pin rattles', 'low', 'open', fleet_today() - 20, 'Aroha King', null),
 ('80000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'Sliding door latch sticking', 'medium', 'open', fleet_today() - 11, 'Ben Murray', '70000000-0000-4000-8000-000000000006')
on conflict do nothing;

insert into parts (id, name, sku, stock, reorder_at, unit_cost_cents, currency, vendor_id) values
 ('90000000-0000-4000-8000-000000000001', 'Oil filter Toyota 1GD', 'OF-1GD', 2, 4, 3200, 'NZD', '30000000-0000-4000-8000-000000000001'),
 ('90000000-0000-4000-8000-000000000002', 'Engine oil 5W-30 (litre)', 'OIL-5W30', 40, 20, 1150, 'NZD', '30000000-0000-4000-8000-000000000001'),
 ('90000000-0000-4000-8000-000000000003', 'Brake pads front Hiace', 'BP-HIACE-F', 1, 2, 9800, 'NZD', '30000000-0000-4000-8000-000000000002')
on conflict do nothing;

insert into fuel_entries (id, vehicle_id, filled_on, litres, total_cents, odometer, partial, fuel_type, vendor, card, reference, currency) values
 ('a0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', fleet_today() - 40, 62.0, 15500, 180000, false, 'diesel', 'Z Onehunga', 'CARD-01', 'Z-1001', 'NZD'),
 ('a0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', fleet_today() - 30, 64.0, 16000, 180700, false, 'diesel', 'Z Onehunga', 'CARD-01', 'Z-1002', 'NZD'),
 ('a0000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', fleet_today() - 20, 30.0, 7500, 181100, true, 'diesel', 'BP Penrose', 'CARD-01', 'BP-2001', 'NZD'),
 ('a0000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', fleet_today() - 12, 35.0, 8750, 181450, false, 'diesel', 'Z Onehunga', 'CARD-01', 'Z-1003', 'NZD'),
 ('a0000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', fleet_today() - 3, 66.0, 16500, 182200, false, 'diesel', 'Z Onehunga', 'CARD-01', 'Z-1004', 'NZD'),
 ('a0000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000005', fleet_today() - 35, 180.0, 36000, 400000, false, 'diesel', 'Ampol Eagle Farm', 'CARD-05', 'AM-501', 'AUD'),
 ('a0000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000005', fleet_today() - 25, 185.0, 37000, 400700, false, 'diesel', 'Ampol Eagle Farm', 'CARD-05', 'AM-502', 'AUD'),
 ('a0000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000005', fleet_today() - 15, 182.0, 36400, 401400, false, 'diesel', 'Ampol Eagle Farm', 'CARD-05', 'AM-503', 'AUD'),
 ('a0000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000005', fleet_today() - 6, 290.0, 58000, 402100, false, 'diesel', 'Shell Pinkenba', 'CARD-05', 'SH-504', 'AUD'),
 ('a0000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000004', fleet_today() - 9, 58.0, 11600, 127400, false, 'petrol', 'Shell Pinkenba', 'CARD-04', 'SH-410', 'AUD'),
 ('a0000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000007', fleet_today() - 14, 70.0, 17500, 411200, false, 'diesel', 'Gull Te Rapa', 'CARD-07', 'G-701', 'NZD'),
 ('a0000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000007', fleet_today() - 5, 71.0, 17750, 411950, false, 'diesel', 'Gull Te Rapa', 'CARD-07', 'G-702', 'NZD')
on conflict do nothing;

insert into expenses (id, vehicle_id, kind, spent_on, amount_cents, currency, note) values
 ('b0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'ruc', fleet_today() - 70, 76000, 'NZD', '10,000 km RUC licence'),
 ('b0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'insurance', fleet_today() - 200, 142000, 'NZD', 'Annual commercial vehicle cover'),
 ('b0000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000005', 'registration', fleet_today() - 275, 318000, 'AUD', 'QLD heavy vehicle registration'),
 ('b0000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000005', 'tolls', fleet_today() - 20, 42000, 'AUD', 'Linkt, last quarter'),
 ('b0000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000007', 'ruc', fleet_today() - 90, 76000, 'NZD', '10,000 km RUC licence'),
 ('b0000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000003', 'ruc', fleet_today() - 150, 390000, 'NZD', 'Heavy RUC licence')
on conflict do nothing;

insert into notes (id, vehicle_id, note, created_at) values
 ('c0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000007', 'Driver reports it is using a litre of oil between services.', now() - interval '6 days'),
 ('c0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', 'Taken off the road by the Hamilton depot manager until the brakes are checked.', now() - interval '2 days')
on conflict do nothing;
