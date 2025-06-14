import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';
import { validateFields } from '../middlewares/validation.middleware';

class UserController {
  getMe = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.getMe(req.user._id);
    res.status(200).json({ success: true, data: user });
  });

  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.updateUser(req.user._id, req.body);
    res.status(200).json({ success: true, data: user });
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
    res.status(200).json({ success: true, data: user });
  });

  updateNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id;

    const { notifications } = req.body;
    const user = await userService.updateNotifications(userId, notifications);
    res.status(200).json({ success: true, data: user });
  });

  updateDevice = [
    validateFields(['device']),
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user._id;

      const { device } = req.body;
      const user = await userService.updateDevice(userId, device);
      res.status(200).json({ success: true, data: user });
    }),
  ];

  updateFcmToken = [
    validateFields(['fcmToken']),
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user._id;
      const { fcmToken } = req.body;

      const user = await userService.updateFcmToken(userId, fcmToken);
      res.status(200).json({ success: true, data: user });
    }),
  ];
}

export const userController = new UserController();
