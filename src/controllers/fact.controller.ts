import { asyncHandler } from '../utils/asyncHandler';
import { validateFields } from '../middlewares/validation.middleware';
import { Request, Response } from 'express';
import { factService } from '../services/fact.service';

export const createFact = [
  validateFields(['title', 'description', 'category', 'tags']),
  asyncHandler(async (req: Request, res: Response) => {
    const { title, description, category, tags } = req.body;
    const fact = await factService.create({ title, description, category, tags });
    res.status(201).json(fact);
  }),
];
export const updateFact = [
  asyncHandler(async (req: Request, res: Response) => {
    const { title, description, category, tags } = req.body;
    const fact = await factService.update(req.params.id, { title, description, category, tags });
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
    const { page, limit, search, categoryId, sortBy, sortOrder } = req.query;
    const facts = await factService.getFacts(
      Number(page),
      Number(limit),
      search as string,
      categoryId as string,
      sortBy as string,
      sortOrder as 'asc' | 'desc'
    );
    res.status(200).json(facts);
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
