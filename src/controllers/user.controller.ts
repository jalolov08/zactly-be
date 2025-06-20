import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';
import { validateFields } from '../middlewares/validation.middleware';
import { UserDevice } from '../types/user.type';

class UserController {
  getMe = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.getMe(req.user._id);
    res.status(200).json({ success: true, user });
  });

  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.updateUser(req.user._id, req.body);
    res.status(200).json({ success: true, user });
  });

  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId;

    await userService.deleteUser(userId);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  });

  updateInterests = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id;

    const { interests } = req.body;
    const user = await userService.updateInterests(userId, interests);
    res.status(200).json({ success: true, user });
  });

  updateNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id;

    const { notifications } = req.body;
    const user = await userService.updateNotifications(userId, notifications);
    res.status(200).json({ success: true, user });
  });

  updateDevice = [
    validateFields(['device']),
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user._id;

      const { device } = req.body;
      const user = await userService.updateDevice(userId, device);
      res.status(200).json({ success: true, user });
    }),
  ];

  updateFcmToken = [
    validateFields(['fcmToken']),
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user._id;
      const { fcmToken } = req.body;

      const user = await userService.updateFcmToken(userId, fcmToken);
      res.status(200).json({ success: true, user });
    }),
  ];

  updatePersonalizedAds = [
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user._id;
      const { allowPersonalizedAds } = req.body;
      const user = await userService.updatePersonalizedAds(userId, allowPersonalizedAds);
      res.status(200).json({ success: true, user });
    }),
  ];

  incrementAdClick = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id;
    const user = await userService.incrementAdClickCount(userId);
    res.status(200).json({ success: true, user });
  });

  getUsers = [
    asyncHandler(async (req: Request, res: Response) => {
      const { page, limit, search, device } = req.query;
      const users = await userService.getUsers(
        Number(page),
        Number(limit),
        String(search),
        String(device) as UserDevice
      );
      res.status(200).json(users);
    }),
  ];

  toggleUserBlock = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId;
    const { isBlocked } = req.body;
    const user = await userService.toggleUserBlock(userId, isBlocked);
    res.status(200).json({ success: true, user });
  });
}

export const userController = new UserController();
