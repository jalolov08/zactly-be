import { Router } from 'express';
import {
  createFact,
  updateFact,
  deleteFact,
  getFacts,
  getFeed,
  getFeedByCategory,
  markAsViewed,
} from '../controllers/fact.controller';
import { requireAuth } from '../middlewares/requiredAuth.middleware';
import { withAuth } from '../utils/withAuth';
import { UserRole } from '../types/user.type';

export const factRouter = Router();

factRouter.get('/', withAuth([UserRole.ADMIN]), getFacts);
factRouter.get('/feed', withAuth([UserRole.ADMIN]), getFeed);
factRouter.get('/feed/:categoryId', withAuth([UserRole.ADMIN]), getFeedByCategory);
factRouter.post('/:factId/view', withAuth([UserRole.ADMIN]), markAsViewed);

factRouter.post('/', requireAuth, createFact);
factRouter.put('/:id', requireAuth, updateFact);
factRouter.delete('/:id', requireAuth, deleteFact);
