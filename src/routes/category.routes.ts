import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { UserRole } from '../types/user.type';
import { withAuth } from '../utils/withAuth';
import { upload } from '../utils/upload';

export const categoryRouter = Router();

categoryRouter.post(
  '/',
  withAuth([UserRole.ADMIN]),
  upload.single('image'),
  categoryController.create
);
categoryRouter.get('/', withAuth([UserRole.ADMIN]), categoryController.getAll);
categoryRouter.get('/active', categoryController.getActive);
categoryRouter.patch(
  '/:id',
  withAuth([UserRole.ADMIN]),
  upload.single('image'),
  categoryController.update
);
categoryRouter.delete('/:id', withAuth([UserRole.ADMIN]), categoryController.delete);
