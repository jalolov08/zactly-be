import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../utils/errors';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const anonId = req.headers['x-anon-id'];

  if (!userId && !anonId) {
    throw new BadRequestError('Either authentication or anonId is required');
  }

  next();
};
