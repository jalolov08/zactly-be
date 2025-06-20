import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { validateFields } from '../middlewares/validation.middleware';

export class AuthController {
  signUpWithEmail = [
    validateFields(['name', 'surname', 'email', 'password']),
    asyncHandler(async (req: Request, res: Response) => {
      const { name, surname, email, password } = req.body;
      const result = await authService.signUpWithEmail({ name, surname, email, password });
      res.status(201).json(result);
    }),
  ];

  verifyOtp = [
    validateFields(['email', 'code']),
    asyncHandler(async (req: Request, res: Response) => {
      const { email, code, device, locationData } = req.body;
      const result = await authService.verifyOtp({ email, code, device, locationData });
      res.status(200).json(result);
    }),
  ];

  loginWithPassword = [
    validateFields(['email', 'password']),
    asyncHandler(async (req: Request, res: Response) => {
      const { email, password, device, locationData } = req.body;
      const result = await authService.loginWithPassword({
        email,
        password,
        device,
        locationData,
      });
      res.status(200).json(result);
    }),
  ];

  requestPasswordReset = [
    validateFields(['email']),
    asyncHandler(async (req: Request, res: Response) => {
      const { email } = req.body;
      const result = await authService.requestPasswordReset(email);
      res.status(200).json(result);
    }),
  ];

  resetPasswordWithOtp = [
    validateFields(['email', 'code', 'newPassword']),
    asyncHandler(async (req: Request, res: Response) => {
      const { email, code, newPassword, device, locationData } = req.body;
      const result = await authService.resetPasswordWithOtp({
        email,
        code,
        newPassword,
        device,
        locationData,
      });
      res.status(200).json(result);
    }),
  ];

  sendOtpToEmail = [
    validateFields(['email']),
    asyncHandler(async (req: Request, res: Response) => {
      const { email } = req.body;
      const result = await authService.sendOtpToEmail(email);
      res.status(200).json(result);
    }),
  ];

  signUpWithGoogle = [
    validateFields(['idToken']),
    asyncHandler(async (req: Request, res: Response) => {
      const { idToken, device, locationData } = req.body;
      const result = await authService.signUpWithGoogle({
        idToken,
        device,
        locationData,
      });
      res.status(200).json(result);
    }),
  ];

  signUpWithApple = [
    validateFields(['idToken']),
    asyncHandler(async (req: Request, res: Response) => {
      const { idToken, device, locationData } = req.body;
      const result = await authService.signUpWithApple({
        idToken,
        device,
        locationData,
      });
      res.status(200).json(result);
    }),
  ];

  logout = [
    validateFields(['userId']),
    asyncHandler(async (req: Request, res: Response) => {
      const { userId } = req.body;
      const result = await authService.logout(userId);
      res.status(200).json(result);
    }),
  ];

  refreshToken = [
    asyncHandler(async (req: Request, res: Response) => {
      const { refreshToken } = req.query;
      const result = await authService.refreshToken(refreshToken as string);
      res.status(200).json(result);
    }),
  ];

  resendOtp = [
    validateFields(['email']),
    asyncHandler(async (req: Request, res: Response) => {
      const { email } = req.body;
      const result = await authService.resendOtp(email);
      res.status(200).json(result);
    }),
  ];
}

export const authController = new AuthController();
