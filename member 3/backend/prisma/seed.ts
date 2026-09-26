import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = await Promise.all(
    [
      { name: 'Raw Materials', description: 'Basic inputs and materials' },
      { name: 'Finished Goods', description: 'Completed products ready for sale' },
      { name: 'Packaging', description: 'Boxes, pallets and wrapping materials' },
    ].map((c) =>
      prisma.productCategory.upsert({ where: { name: c.name }, update: {}, create: c })
    )
  );

  const whA = await prisma.warehouse.upsert({
    where: { code: 'WH-A' },
    update: {},
    create: { code: 'WH-A', name: 'Main Warehouse', address: '123 Industrial Way' },
  });
  const whB = await prisma.warehouse.upsert({
    where: { code: 'WH-B' },
    update: {},
    create: { code: 'WH-B', name: 'Secondary Warehouse', address: '456 Logistics Ave' },
  });

  const locAA = await prisma.location.upsert({
    where: { warehouseId_code: { warehouseId: whA.id, code: 'RACK-A' } },
    update: {},
    create: { warehouseId: whA.id, code: 'RACK-A', name: 'Rack A', zone: 'Zone 1' },
  });
  const locAB = await prisma.location.upsert({
    where: { warehouseId_code: { warehouseId: whA.id, code: 'RACK-B' } },
    update: {},
    create: { warehouseId: whA.id, code: 'RACK-B', name: 'Rack B', zone: 'Zone 2' },
  });
  const locBA = await prisma.location.upsert({
    where: { warehouseId_code: { warehouseId: whB.id, code: 'RACK-A' } },
    update: {},
    create: { warehouseId: whB.id, code: 'RACK-A', name: 'Rack A', zone: 'Zone 1' },
  });
  await prisma.location.upsert({
    where: { warehouseId_code: { warehouseId: whB.id, code: 'RACK-B' } },
    update: {},
    create: { warehouseId: whB.id, code: 'RACK-B', name: 'Rack B', zone: 'Zone 2' },
  });

  const rawMaterials = categories.find((c) => c.name === 'Raw Materials')!;
  const finishedGoods = categories.find((c) => c.name === 'Finished Goods')!;
  const packaging = categories.find((c) => c.name === 'Packaging')!;

  const steelRod = await prisma.product.upsert({
    where: { sku: 'STL-ROD-10' },
    update: {},
    create: {
      sku: 'STL-ROD-10',
      name: 'Steel Rod 10mm',
      description: '10mm diameter steel rod',
      categoryId: rawMaterials.id,
      unit: 'unit',
    },
  });
  const officeChair = await prisma.product.upsert({
    where: { sku: 'CHR-OFC-01' },
    update: {},
    create: {
      sku: 'CHR-OFC-01',
      name: 'Office Chair',
      description: 'Ergonomic office chair',
      categoryId: finishedGoods.id,
      unit: 'unit',
    },
  });
  const cartonBox = await prisma.product.upsert({
    where: { sku: 'BOX-CTN-20' },
    update: {},
    create: {
      sku: 'BOX-CTN-20',
      name: 'Carton Box 20cm',
      description: '20cm cardboard carton',
      categoryId: packaging.id,
      unit: 'unit',
    },
  });

  await Promise.all(
    [
      { name: 'Damaged', description: 'Goods damaged or broken' },
      { name: 'Lost', description: 'Goods missing or unaccounted for' },
      { name: 'Counting Error', description: 'Previous count was incorrect' },
      { name: 'Other', description: 'Other reason not listed' },
    ].map((r) => prisma.adjustmentReason.upsert({ where: { name: r.name }, update: {}, create: r }))
  );

  const openingStock: { productId: string; locationId: string; quantity: number }[] = [
    { productId: steelRod.id, locationId: locAA.id, quantity: 500 },
    { productId: steelRod.id, locationId: locBA.id, quantity: 100 },
    { productId: officeChair.id, locationId: locAB.id, quantity: 200 },
    { productId: cartonBox.id, locationId: locAA.id, quantity: 1000 },
  ];
  for (const s of openingStock) {
    await prisma.stock.upsert({
      where: { productId_locationId: { productId: s.productId, locationId: s.locationId } },
      update: {},
      create: s,
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
