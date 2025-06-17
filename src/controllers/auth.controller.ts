import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { validateFields } from '../middlewares/validation.middleware';

export class AuthController {
  signUpWithEmail = [
    validateFields(['name', 'surname', 'email', 'password']),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { name, surname, email, password } = req.body;
      const result = await authService.signUpWithEmail({ name, surname, email, password });
      res.status(201).json(result);
    }),
  ];

  verifyOtp = [
    validateFields(['email', 'code']),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { email, code } = req.body;
      const result = await authService.verifyOtp({ email, code });
      res.status(200).json(result);
    }),
  ];

  loginWithPassword = [
    validateFields(['email', 'password']),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { email, password } = req.body;
      const result = await authService.loginWithPassword({ email, password });
      res.status(200).json(result);
    }),
  ];

  requestPasswordReset = [
    validateFields(['email']),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { email } = req.body;
      const result = await authService.requestPasswordReset(email);
      res.status(200).json(result);
    }),
  ];

  resetPasswordWithOtp = [
    validateFields(['email', 'code', 'newPassword']),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { email, code, newPassword } = req.body;
      const result = await authService.resetPasswordWithOtp({ email, code, newPassword });
      res.status(200).json(result);
    }),
  ];

  sendOtpToEmail = [
    validateFields(['email']),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { email } = req.body;
      const result = await authService.sendOtpToEmail(email);
      res.status(200).json(result);
    }),
  ];

  signUpWithGoogle = [
    validateFields(['idToken']),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { idToken } = req.body;
      const result = await authService.signUpWithGoogle({ idToken });
      res.status(200).json(result);
    }),
  ];

  signUpWithApple = [
    validateFields(['idToken']),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { idToken } = req.body;
      const result = await authService.signUpWithApple({ idToken });
      res.status(200).json(result);
    }),
  ];

  logout = [
    validateFields(['userId']),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { userId } = req.body;
      const result = await authService.logout(userId);
      res.status(200).json(result);
    }),
  ];

  refreshToken = [
    validateFields(['refreshToken'], 'query'),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { refreshToken } = req.query;
      const result = await authService.refreshToken(refreshToken as string);
      res.status(200).json(result);
    }),
  ];

  resendOtp = [
    validateFields(['email']),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { email } = req.body;
      const result = await authService.resendOtp(email);
      res.status(200).json(result);
    }),
  ];
}

export const authController = new AuthController();
