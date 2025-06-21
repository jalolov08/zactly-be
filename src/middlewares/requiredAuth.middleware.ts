import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../utils/errors';
import { tokenService } from '../services/token.service';
import { handleTokenError } from './authenticate.middleware';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const anonId = req.headers['x-anon-id'];
  const token = req.headers.authorization?.split(' ')[1];

  if (!token && !anonId) {
    return next(new BadRequestError('Either authentication token or anonId is required'));
  }

  if (!token && anonId) {
    return next();
  }

  try {
    const decoded = tokenService.verifyAccessToken(token!);
    req.user = decoded;
    return next();
  } catch (error) {
    handleTokenError(error, res);
  }
};
