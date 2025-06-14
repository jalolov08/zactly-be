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
      res.json(result);
    }),
  ];

  loginWithPassword = [
    validateFields(['email', 'password']),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { email, password } = req.body;
      const result = await authService.loginWithPassword({ email, password });
      res.json(result);
    }),
  ];

  requestPasswordReset = [
    validateFields(['email']),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { email } = req.body;
      const result = await authService.requestPasswordReset(email);
      res.json(result);
    }),
  ];

  resetPasswordWithOtp = [
    validateFields(['email', 'code', 'newPassword']),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { email, code, newPassword } = req.body;
      const result = await authService.resetPasswordWithOtp({ email, code, newPassword });
      res.json(result);
    }),
  ];

  sendOtpToEmail = [
    validateFields(['email']),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { email } = req.body;
      const result = await authService.sendOtpToEmail(email);
      res.json(result);
    }),
  ];

  signUpWithGoogle = [
    validateFields(['idToken']),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { idToken } = req.body;
      const result = await authService.signUpWithGoogle({ idToken });
      res.json(result);
    }),
  ];

  signUpWithApple = [
    validateFields(['idToken']),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { idToken } = req.body;
      const result = await authService.signUpWithApple({ idToken });
      res.json(result);
    }),
  ];

  logout = [
    validateFields(['userId']),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { userId } = req.body;
      const result = await authService.logout(userId);
      res.json(result);
    }),
  ];

  refreshToken = [
    validateFields(['refreshToken'], 'query'),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { refreshToken } = req.query;
      const result = await authService.refreshToken(refreshToken as string);
      res.json(result);
    }),
  ];
}

export const authController = new AuthController();
