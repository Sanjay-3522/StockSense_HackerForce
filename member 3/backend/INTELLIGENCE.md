# StockSense Inventory Intelligence API (Member 3)

All endpoints are mounted under `/api/intelligence`. The implementation uses the existing Express + Prisma + PostgreSQL backend and Member 2's `StockMovement` ledger. It does not add UI code, modify inventory, or place purchase orders.

## Endpoints

- `GET /overview` — real stock totals, product/warehouse counts, warehouse/category breakdowns, tracked out-of-stock products, and recent movements. Filters: `product_id`, `warehouse_id`, `location_id`, `category_id`, `sku`.
- `GET /movements` — ledger history with pagination. Filters: the overview filters plus `operation_type`, `from`, `to`, `direction` (`positive|negative`), and `reference`; `page` defaults to 1 and `limit` to 50 (maximum 200).
- `GET /stock-explanation` — requires `product_id` and `warehouse_id` or `location_id`; accepts `from`, `to`, and `reference`. Returns opening balance where available, incoming/outgoing/net movement, current stock, unresolved quantity, supporting movements, and an explicit state.
- `POST /investigations` — requires `product_id`, `warehouse_id` or `location_id`, `recorded_quantity`, and `physical_quantity`; accepts optional `from` and `to`. Quantities are nonnegative integers. Calculates `difference = physical - recorded` and traces same-direction movement records.
- `GET /anomalies` — filters include inventory IDs/SKU, `operation_type`, dates, `direction`, `reference`, `severity`, and `anomaly_type`. Rules are transparent median/MAD outlier tests, active-day spike comparisons, and repeated adjustment signals; each provides evidence IDs. Historical thresholds require at least five observations.
- `GET /reorder` — returns current stock and average daily negative delivery movement over a 90-day window. It reports `INSUFFICIENT_DATA` until a real `ReorderRule` model/threshold and target quantity are integrated; it will not guess or recommend a fabricated quantity.
- `GET /actions` — refreshes derived anomaly and out-of-stock conditions, then returns persisted human actions. Supports `priority`, `status`, `type`, `source`, `warehouse_id`, `product_id`, `from`, `to`, pagination.
- `GET /actions/:id` — reads a single action.
- `PATCH /actions/:id` — accepts `{ "status": "IN_PROGRESS" | "RESOLVED" | "OPEN" }`; valid transitions include OPEN → IN_PROGRESS → RESOLVED, with IN_PROGRESS → OPEN permitted. Resolution can also be done directly from OPEN via the dedicated resolve endpoint.
- `POST /actions/:id/resolve` — resolves an action.

IDs must be UUIDs. Date ranges are ISO date/time values with `from <= to`. Errors preserve the preexisting `error` string and add a stable `code` field.

## States and limitations

Analysis responses use `READY`, `NO_DATA`, `INSUFFICIENT_DATA`, `EXPLAINED`, `PARTIALLY_EXPLAINED`, or `UNEXPLAINED` as applicable. Anomaly and investigation queries cap analysis at 5,000 rows and indicate when capped. Inventory overview returns at most 100 attention rows; aggregate counts are calculated separately. Low-stock counts cannot be produced because no reorder-rule foundation exists in this archive.

This ZIP contains no authentication middleware or User model. The router follows the existing API's unauthenticated convention; wire the project’s Member 1 authentication middleware when it becomes available rather than adding a second auth system. Foundation Product/Category/Warehouse/Location/Stock models remain explicitly marked placeholders in the supplied Prisma schema.

## Database

A single `IntelligenceAction` model is added; anomaly and investigation results are computed on demand. The SQL migration is under `prisma/migrations/20260926132600_add_intelligence_actions/migration.sql`. The input archive had no migration history, so integrate this migration into the team's actual migration chain before applying it to a shared database.

## Local verification

```sh
npm ci
npx prisma generate
DATABASE_URL='postgresql://user:password@localhost:5432/stocksense?schema=public' npx prisma validate
npm run typecheck
npm run build
npm test
```

Database-backed integration tests require a PostgreSQL database and representative fixture data; the included automated tests exercise deterministic calculation behavior without a database.
