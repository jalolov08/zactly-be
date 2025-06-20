import { Router } from 'express';
import { authRouter } from './auth.routes';
import { userRouter } from './user.routes';
import { categoryRouter } from './category.routes';
import { factRouter } from './fact.routes';
import { statsRouter } from './stats.route';
import { UserRole } from '../types/user.type';
import { withAuth } from '../utils/withAuth';

const router = Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/categories', categoryRouter);
router.use('/facts', factRouter);
router.use('/stats', withAuth([UserRole.ADMIN]), statsRouter);

export default router;
