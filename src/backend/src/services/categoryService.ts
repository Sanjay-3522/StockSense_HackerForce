import { prisma } from "../utils/prismaClient";
import { AppError } from "../utils/AppError";

interface CategoryInput {
  name: string;
  description?: string;
}

export const createCategory = (data: CategoryInput) => prisma.productCategory.create({ data });

export const listCategories = () =>
  prisma.productCategory.findMany({ orderBy: { createdAt: "desc" } });

export const getCategoryById = async (id: string) => {
  const category = await prisma.productCategory.findUnique({ where: { id } });
  if (!category) throw new AppError("Category not found.", 404);
  return category;
};

export const updateCategory = async (id: string, data: Partial<CategoryInput>) => {
  await getCategoryById(id);
  return prisma.productCategory.update({ where: { id }, data });
};

export const deleteCategory = async (id: string) => {
  await getCategoryById(id);
  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    throw new AppError("Cannot delete category: products are still assigned to it.", 409);
  }
  return prisma.productCategory.delete({ where: { id } });
};
