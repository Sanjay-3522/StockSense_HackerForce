import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Foundation-only seed data (users, category, warehouses/locations,
// adjustment reason, one product with a reorder rule). Operation records
// (receipts/deliveries/transfers/adjustments) and intelligence data are
// intentionally NOT seeded — per Step 17, fake intelligence/operations
// data is not created unless explicitly required for testing; the
// end-to-end test plan in the final report creates those through the API
// instead, which also exercises the real transactional code paths.
async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const user = await prisma.user.upsert({
    where: { email: "admin@stocksense.com" },
    update: {},
    create: { name: "Admin", email: "admin@stocksense.com", passwordHash, role: "INVENTORY_MANAGER" },
  });

  await prisma.user.upsert({
    where: { email: "staff@stocksense.com" },
    update: {},
    create: { name: "Warehouse Staff", email: "staff@stocksense.com", passwordHash, role: "WAREHOUSE_STAFF" },
  });

  const category = await prisma.productCategory.upsert({
    where: { name: "Raw Materials" },
    update: {},
    create: { name: "Raw Materials", description: "Default product category" },
  });

  const warehouseA = await prisma.warehouse.upsert({
    where: { code: "WH-A" },
    update: {},
    create: { code: "WH-A", name: "Warehouse A", address: "Coimbatore, TN" },
  });

  const warehouseB = await prisma.warehouse.upsert({
    where: { code: "WH-B" },
    update: {},
    create: { code: "WH-B", name: "Warehouse B", address: "Chennai, TN" },
  });

  const rackA = await prisma.location.upsert({
    where: { warehouseId_code: { warehouseId: warehouseA.id, code: "RACK-A" } },
    update: {},
    create: { warehouseId: warehouseA.id, code: "RACK-A", name: "Rack A", zone: "Zone 1" },
  });

  const rackB = await prisma.location.upsert({
    where: { warehouseId_code: { warehouseId: warehouseB.id, code: "RACK-B" } },
    update: {},
    create: { warehouseId: warehouseB.id, code: "RACK-B", name: "Rack B", zone: "Zone 1" },
  });

  await prisma.adjustmentReason.upsert({
    where: { name: "Damaged" },
    update: {},
    create: { name: "Damaged", description: "Stock damaged in transit or storage" },
  });

  await prisma.adjustmentReason.upsert({
    where: { name: "Cycle Count" },
    update: {},
    create: { name: "Cycle Count", description: "Discrepancy found during a physical stock count" },
  });

  const product = await prisma.product.upsert({
    where: { sku: "SR-001" },
    update: {},
    create: { name: "Steel Rod", sku: "SR-001", categoryId: category.id, unit: "kg" },
  });

  await prisma.reorderRule.upsert({
    where: {
      productId_warehouseId_locationId: { productId: product.id, warehouseId: warehouseA.id, locationId: rackA.id },
    },
    update: {},
    create: {
      productId: product.id,
      warehouseId: warehouseA.id,
      locationId: rackA.id,
      reorderPoint: 100,
      reorderQuantity: 200,
      maxStock: 500,
    },
  });

  console.log("Seed complete:", {
    users: [user.email, "staff@stocksense.com"],
    category: category.name,
    warehouses: [warehouseA.code, warehouseB.code],
    locations: [rackA.code, rackB.code],
    product: product.sku,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
