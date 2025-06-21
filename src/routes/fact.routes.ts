import { Router } from 'express';
import {
  createFact,
  updateFact,
  deleteFact,
  getFacts,
  getFeed,
  getFeedByCategory,
  markAsViewed,
  importFromExcel,
} from '../controllers/fact.controller';
import { requireAuth } from '../middlewares/requiredAuth.middleware';
import { withAuth } from '../utils/withAuth';
import { UserRole } from '../types/user.type';

export const factRouter = Router();

factRouter.get('/', getFacts);
factRouter.get('/feed', requireAuth, getFeed);
factRouter.get('/feed/:categoryId', requireAuth, getFeedByCategory);
factRouter.post('/:factId/view', requireAuth, markAsViewed);

factRouter.post('/', withAuth([UserRole.ADMIN]), createFact);
factRouter.put('/:id', withAuth([UserRole.ADMIN]), updateFact);
factRouter.delete('/:id', withAuth([UserRole.ADMIN]), deleteFact);
factRouter.post('/import/excel', withAuth([UserRole.ADMIN]), importFromExcel);
