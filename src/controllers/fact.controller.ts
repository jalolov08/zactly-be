import { asyncHandler } from '../utils/asyncHandler';
import { validateFields } from '../middlewares/validation.middleware';
import { Request, Response } from 'express';
import { factService } from '../services/fact.service';
import { uploadFactImage } from '../utils/upload';

export const createFact = [
  uploadFactImage.single('image'),
  validateFields(['title', 'description', 'category']),
  asyncHandler(async (req: Request, res: Response) => {
    const { title, description, category } = req.body;
    const image = req.file ? `/uploads/facts/${req.file.filename}` : undefined;
    const fact = await factService.create({ title, description, category, image });
    res.status(201).json(fact);
  }),
];

export const updateFact = [
  uploadFactImage.single('image'),
  asyncHandler(async (req: Request, res: Response) => {
    const { title, description, category, oldImage } = req.body;
    const image = req.file ? `/uploads/facts/${req.file.filename}` : oldImage;
    const fact = await factService.update(req.params.id, {
      title,
      description,
      category,
      image,
    });
    res.status(200).json(fact);
  }),
];

export const deleteFact = [
  asyncHandler(async (req: Request, res: Response) => {
    await factService.delete(req.params.id);
    res.status(204).send();
  }),
];

export const getFacts = [
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, search, categoryId, startDate, endDate, sortBy, sortOrder } = req.query;
    const facts = await factService.getFacts(
      Number(page),
      Number(limit),
      search as string,
      categoryId as string,
      startDate as string,
      endDate as string,
      sortBy as string,
      sortOrder as 'asc' | 'desc'
    );
    res.status(200).json(facts);
  }),
];

export const getFactsCountByCategory = [
  asyncHandler(async (req: Request, res: Response) => {
    const { categoryId } = req.params;
    const count = await factService.getFactsCountByCategory(categoryId);
    res.status(200).json({ count });
  }),
];

export const getTotalFactsCount = [
  asyncHandler(async (req: Request, res: Response) => {
    const count = await factService.getTotalFactsCount();
    res.status(200).json({ count });
  }),
];

export const recalculateCategoryFactsCount = [
  asyncHandler(async (req: Request, res: Response) => {
    await factService.recalculateAllCategoryFactsCount();
    res.status(200).json({ message: 'Количество фактов для всех категорий пересчитано' });
  }),
];

export const getFeed = [
  asyncHandler(async (req: Request, res: Response) => {
    const { limit } = req.query;
    const userId = req.user?._id?.toString();
    const anonId = req.headers['x-anon-id'] as string;
    const feed = await factService.getFeed(Number(limit) || 10, userId, anonId);
    res.status(200).json(feed);
  }),
];

export const getFeedByCategory = [
  asyncHandler(async (req: Request, res: Response) => {
    const { categoryId } = req.params;
    const { limit } = req.query;
    const userId = req.user?._id?.toString();
    const anonId = req.headers['x-anon-id'] as string;

    const feed = await factService.getFeedByCategory(
      categoryId,
      Number(limit) || 10,
      userId,
      anonId
    );
    res.status(200).json(feed);
  }),
];

export const markAsViewed = [
  asyncHandler(async (req: Request, res: Response) => {
    const { factId } = req.params;
    const userId = req.user?._id?.toString();
    const anonId = req.headers['x-anon-id'] as string;

    await factService.markAsViewed(factId, userId, anonId);
    res.status(200).json({ message: 'Fact marked as viewed' });
  }),
];

export const importFromExcel = [
  asyncHandler(async (req: Request, res: Response) => {
    const { data, fieldMapping } = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'Данные Excel не предоставлены или пусты' });
    }

    if (!fieldMapping || typeof fieldMapping !== 'object') {
      return res.status(400).json({ error: 'Маппинг полей не предоставлен' });
    }

    const result = await factService.importFromExcel(data, fieldMapping);
    res.status(200).json(result);
  }),
];
