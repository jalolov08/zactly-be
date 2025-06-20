import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/authenticate.middleware';
import { withAuth } from '../utils/withAuth';
import { UserRole } from '../types/user.type';

export const userRouter = Router();

userRouter.get('/me', authenticate, userController.getMe);
userRouter.patch('/', authenticate, userController.updateUser);
userRouter.delete('/:userId', withAuth([UserRole.ADMIN]), userController.deleteUser);
userRouter.patch('/interests', authenticate, userController.updateInterests);
userRouter.patch('/notifications', authenticate, userController.updateNotifications);
userRouter.patch('/device', authenticate, userController.updateDevice);
userRouter.patch('/fcm-token', authenticate, userController.updateFcmToken);
userRouter.patch('/personalized-ads', authenticate, userController.updatePersonalizedAds);
userRouter.post('/ad-click', authenticate, userController.incrementAdClick);
userRouter.get('/', withAuth([UserRole.ADMIN]), userController.getUsers);
userRouter.patch('/block/:userId', withAuth([UserRole.ADMIN]), userController.toggleUserBlock);
