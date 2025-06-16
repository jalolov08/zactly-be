import { Router } from 'express';
import { authRouter } from './auth.routes';
import { userRouter } from './user.routes';
import { categoryRouter } from './category.routes';
import { factRouter } from './fact.routes';

const router = Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/categories', categoryRouter);
router.use('/facts', factRouter);

export default router;
