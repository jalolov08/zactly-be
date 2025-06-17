import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/authenticate.middleware';

export const authRouter = Router();

authRouter.post('/signup', authController.signUpWithEmail);
authRouter.post('/verify-otp', authController.verifyOtp);
authRouter.post('/login', authController.loginWithPassword);
authRouter.post('/request-password-reset', authController.requestPasswordReset);
authRouter.post('/reset-password', authController.resetPasswordWithOtp);
authRouter.post('/send-otp', authController.sendOtpToEmail);
authRouter.post('/google', authController.signUpWithGoogle);
authRouter.post('/apple', authController.signUpWithApple);
authRouter.post('/logout', authenticate, authController.logout);
authRouter.get('/refresh-token', authController.refreshToken);
authRouter.post('/resend-otp', authController.resendOtp);
