# Fleetio sample files

Small files in the shape of Fleetio's own import templates and index exports, used by `npm test` and as a reference when you map your real export. Column names follow Fleetio's Vehicle, Fuel Entries and Service Entries (Advanced) import guides. Values are fictional.

- `fleetio/vehicles.csv`: one vehicle on a miles meter (converted to km on import), one already in the demo (linked, not duplicated), and a custom field column (kept in `source_data`).
- `fleetio/fuel.csv`: one entry with a total, one priced per litre only.
- `fleetio/service.csv`: a two-line service entry grouped by `external_id`, and one entry with only a line total.
