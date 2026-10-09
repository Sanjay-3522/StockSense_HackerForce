import { prisma } from "../utils/prismaClient";
import { AppError } from "../utils/AppError";
import { isValidUnit } from "../utils/units";

interface ProductInput {
  name: string;
  sku: string;
  description?: string;
  categoryId: string;
  unit: string;
  barcode?: string;
  initialStock?: number;
  // Where to create the corresponding Stock row when initialStock is
  // supplied. Not a Product column — used only to drive the Stock creation
  // in the same transaction as the Product create (see createProduct below).
  initialStockLocationId?: string;
  isActive?: boolean;
}

const assertValidCategory = async (categoryId: string) => {
  const category = await prisma.productCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new AppError("Referenced category does not exist.", 400);
};

const assertValidUnit = (unit: string) => {
  if (!isValidUnit(unit)) {
    throw new AppError(`Unsupported unit of measure: ${unit}`, 400);
  }
};

const assertValidLocation = async (locationId: string) => {
  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) throw new AppError("Referenced initial stock location does not exist.", 400);
};

export const createProduct = async (data: ProductInput) => {
  await assertValidCategory(data.categoryId);
  assertValidUnit(data.unit);

  const { initialStockLocationId, ...productData } = data;
  const hasInitialStock = !!productData.initialStock && productData.initialStock > 0;

  if (hasInitialStock && !initialStockLocationId) {
    throw new AppError(
      "initialStockLocationId is required when initialStock is greater than zero.",
      400
    );
  }

  if (initialStockLocationId) {
    await assertValidLocation(initialStockLocationId);
  }

  // Product creation and the resulting Stock row must succeed or fail
  // together — otherwise Product.initialStock could report a quantity that
  // Stock (the actual source of truth for inventory) never received.
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({ data: productData });

    if (hasInitialStock && initialStockLocationId) {
      await tx.stock.create({
        data: {
          productId: product.id,
          locationId: initialStockLocationId,
          quantity: productData.initialStock as number,
        },
      });
    }

    return tx.product.findUniqueOrThrow({
      where: { id: product.id },
      include: { category: true, stocks: { include: { location: true } } },
    });
  });
};

export const listProducts = (filters: { search?: string; categoryId?: string; isActive?: boolean }) => {
  const { search, categoryId, isActive } = filters;

  return prisma.product.findMany({
    where: {
      ...(categoryId ? { categoryId } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { sku: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
};

export const getProductById = async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, stocks: true },
  });
  if (!product) throw new AppError("Product not found.", 404);
  return product;
};

export const updateProduct = async (id: string, data: Partial<ProductInput>) => {
  await getProductById(id);
  if (data.categoryId) await assertValidCategory(data.categoryId);
  if (data.unit) assertValidUnit(data.unit);

  // initialStockLocationId only drives Stock creation at product-creation
  // time (see createProduct); it is not a Product column and updating
  // stock quantities afterward is operational-layer logic, out of scope here.
  const { initialStockLocationId: _ignored, ...updateData } = data;

  return prisma.product.update({ where: { id }, data: updateData, include: { category: true } });
};

export const deleteProduct = async (id: string) => {
  await getProductById(id);
  return prisma.product.delete({ where: { id } });
};
