# Moving from Fleetio

Fleetio lets you get your records out two ways, per its help centre ([Data Export Overview](https://help.fleetio.com/importexport-data/data-export-overview-9)):

- **Export All Account Data** (account owners and admins): Settings, Export Account Data, choose the areas and CSV, and Fleetio emails a download link that expires after 7 days.
- **Record exports** from an index page (Vehicles, Meter Entries, Expense Entries, Service Tasks, Service Reminders, Contacts, Parts, Vendors, Warranties, inspection submissions): More Actions, Export Data.
- Several **import templates** can be downloaded prefilled with your existing records, in the same columns Fleetio's own importer uses. These are the easiest files to bring across.

## Import in this order

Vehicles first, because fuel and service rows find their vehicle by name or VIN.

```bash
npm run fleet -- import fleetio vehicles vehicles.csv --country=NZ            # dry run: counts and notes, nothing saved
npm run fleet -- import fleetio vehicles vehicles.csv --country=NZ --apply
npm run fleet -- import fleetio fuel fuel.csv --apply
npm run fleet -- import fleetio service service.csv --apply
```

Every run is a dry run until you add `--apply`. If any row fails, the whole file rolls back and the error names the row. Running the same file twice adds nothing: each source row is remembered in `import_rows`. Every original column, including custom fields, is kept in `source_data` on the record.

## What maps

| Fleetio column | Here |
|---|---|
| `name`, `vin`, `license_plate`, `year`, `make`, `model` | the vehicle |
| `type` | ute, van, car, light truck, heavy truck, trailer, plant or other (Pickup becomes ute, Box Truck becomes light truck) |
| `group` | depot |
| `status` | active, in workshop (In Shop), out of service, or sold |
| `current_meter` with `meter_unit` | odometer in km. Miles are converted. An hours meter marks the vehicle as plant |
| `fuel_type` | diesel, petrol, petrol hybrid, plug-in hybrid, electric |
| `purchase_date`, `purchase_price` | purchase date and price, in the currency you pass with `--currency` |
| Fuel: `vehicle_name` or `vehicle_vin`, `date`, `volume`, `odometer`, `total_price` or `price_per_fuel_unit`, `partial`, `vendor`, `reference` | a fuel fill. `--volume-unit=us_gallons` converts to litres |
| Service: `external_id`, `vehicle_name`, `completed_at`, `meter_value`, `service_task`, `vendor`, `reference`, `general_notes`, `labor_subtotal`, `parts_subtotal`, `line_item_subtotal`, `tax1`, `tax2` | one completed work order per `external_id`, one line per `service_task`. A task with the same name as one of the vehicle's service programs resets that program |

Dates can be `YYYY-MM-DD` or day and month with slashes. When a date could be read either way (03/04/2026), the import stops and asks for `--date-order=dmy` or `--date-order=mdy`. Fleetio is a US product, so check which your export uses.

## What does not carry over on its own

- **Renewal reminders** (rego, WoF, insurance): add them with `/renew` or `/add renewal`. NZ RUC licences are distance-based: record the licence's end odometer.
- **Service programs**: add each vehicle's intervals with `/add program`, with the manufacturer's schedule in `reference`. Then import service history so the last-done dates line up.
- **Issues, inspections, work orders in progress, parts stock, contacts and documents or photos**: map them by hand or ask Claude Code to map the export. Keep the original files as your evidence.
- **Telematics and fuel card feeds**: the free version takes CSV. A live connection is part of a custom build.
- **Custom fields**: kept in `source_data`. Turn one into a proper column with `/customise`.

## Run both for a fortnight

Keep Fleetio running for two weeks. Record new fills, readings and jobs in both, compare `/attention` and `/service-due` against Fleetio's reminders, then cancel.

Enterprise DNA does this move for you as part of a customised or managed version: https://enterprisedna.co/omni/instead-of/fleetio
