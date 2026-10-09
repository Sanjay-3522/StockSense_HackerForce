# StockSense

> A modular Inventory Management System for centralized, reliable, and intelligent inventory operations.

# StockSense

StockSense is a modular Inventory Management System (IMS) designed to digitize
and streamline stock-related operations within a business.

It replaces manual registers, Excel sheets, and scattered inventory tracking
with a centralized application for managing products, warehouses, stock
movements, receipts, deliveries, internal transfers, and inventory adjustments.


==================================================
CORE FUNCTIONALITIES
==================================================

1. AUTHENTICATION
- User signup and login
- OTP-based password reset
- JWT-based authentication
- Redirect to the Inventory Dashboard after login


2. DASHBOARD
- Total products in stock
- Low-stock and out-of-stock items
- Pending receipts
- Pending deliveries
- Scheduled internal transfers
- Dynamic filtering by:
  - Document type
  - Status
  - Warehouse/location
  - Product category


3. PRODUCT MANAGEMENT
- Create and update products
- Product name
- SKU/code
- Category
- Unit of Measure (UOM)
- Optional initial stock
- Stock availability by location
- Product categories
- Reordering rules


4. RECEIPTS
Used for incoming goods from suppliers.
Process:
1. Create a receipt.
2. Add supplier and products.
3. Enter received quantities.
4. Validate the receipt.
5. Stock is automatically increased.


5. DELIVERY ORDERS
Used when stock leaves the warehouse.
Process:
1. Pick items.
2. Pack items.
3. Validate the delivery.
4. Stock is automatically decreased.


6. INTERNAL TRANSFERS
Move stock between warehouses or locations.
Examples:
Main Warehouse -> Production Floor
Rack A -> Rack B
Warehouse 1 -> Warehouse 2
Each movement is recorded in the Stock Ledger.


7. INVENTORY ADJUSTMENTS
Used to reconcile recorded stock with the physical stock count.
- Select product/location.
- Enter physical quantity.
- System updates the recorded quantity.
- Adjustment is recorded in the Stock Ledger.


8. MOVE HISTORY / STOCK LEDGER
Records:
- Receipts
- Deliveries
- Internal transfers
- Inventory adjustments


9. ADDITIONAL FEATURES
- Low-stock alerts
- Multi-warehouse support
- SKU search
- Smart filters
- Inventory intelligence and analytics


==================================================
TECHNOLOGY STACK
==================================================

Frontend:
- React
- TypeScript
- Vite

Backend:
- Express
- TypeScript
- Prisma

Database:
- PostgreSQL
- Hosted PostgreSQL database through Neon
