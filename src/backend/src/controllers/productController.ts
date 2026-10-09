import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as productService from "../services/productService";

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json({ success: true, data: product });
});

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const { search, categoryId, isActive } = req.query;
  const products = await productService.listProducts({
    search: search as string | undefined,
    categoryId: categoryId as string | undefined,
    isActive: isActive !== undefined ? isActive === "true" : undefined,
  });
  res.status(200).json({ success: true, data: products });
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getProductById(req.params.id);
  res.status(200).json({ success: true, data: product });
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  res.status(200).json({ success: true, data: product });
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  await productService.deleteProduct(req.params.id);
  res.status(200).json({ success: true, message: "Product deleted successfully." });
});
