import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as categoryService from "../services/categoryService";

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.createCategory(req.body);
  res.status(201).json({ success: true, data: category });
});

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await categoryService.listCategories();
  res.status(200).json({ success: true, data: categories });
});

export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.getCategoryById(req.params.id);
  res.status(200).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  res.status(200).json({ success: true, data: category });
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  await categoryService.deleteCategory(req.params.id);
  res.status(200).json({ success: true, message: "Category deleted successfully." });
});
