import { Request, Response } from 'express';
import { categoryService } from '../services/category.service';
import { BadRequestError } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler';
import path from 'path';

class CategoryController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const { name, description, sortOrder } = req.body;
    const image = req.file;

    if (!name || !description || !image) {
      throw new BadRequestError('Необходимо указать название, описание и изображение');
    }

    const category = await categoryService.create({
      name,
      description,
      image: `/uploads/categories/${image.filename}`,
      sortOrder: sortOrder || 0,
      isActive: true,
      factsCount: 0,
    });

    res.status(201).json(category);
  });

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const categories = await categoryService.findAll();
    res.status(200).json(categories);
  });

  getActive = asyncHandler(async (req: Request, res: Response) => {
    const categories = await categoryService.getActiveCategories();
    res.status(200).json(categories);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, sortOrder, isActive } = req.body;
    const image = req.file;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (image) updateData.image = `/uploads/categories/${image.filename}`;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('Необходимо указать хотя бы одно поле для обновления');
    }

    const category = await categoryService.update(id, updateData);
    res.status(200).json(category);
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await categoryService.delete(id);
    res.status(204).send();
  });
}

export const categoryController = new CategoryController();
