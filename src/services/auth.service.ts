import { User } from '../models/user.model';
import { tokenService } from './token.service';
import { userService } from './user.service';
import { UserRole, UserDevice } from '../types/user.type';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import verifyAppleToken from 'verify-apple-id-token';
import {
  ConflictError,
  UnauthorizedError,
  InternalServerError,
  NotFoundError,
  BadRequestError,
} from '../utils/errors';
import { config } from '../config';
import { OtpModel } from '../models/otp.model';
import { sendMail } from '../utils/mailer';

const googleClient = new OAuth2Client(config.googleClientId);

class AuthService {
  async signUpWithEmail({
    name,
    surname,
    email,
    password,
  }: {
    name: string;
    surname: string;
    email: string;
    password: string;
  }) {
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) throw new ConflictError('Пользователь с таким email уже существует');
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.create({
        name,
        surname,
        email,
        password: hashedPassword,
        role: UserRole.USER,
        isEmailVerified: false,
      });

      await this.sendOtpToEmail(email);
      return { message: 'Пользователь создан. Проверьте email для подтверждения.' };
    } catch (error) {
      console.error('Ошибка при регистрации через email:', error);
      if (error instanceof ConflictError) throw error;
      if (error instanceof NotFoundError) throw error;
      if (error instanceof UnauthorizedError) throw error;
      if (error instanceof BadRequestError) throw error;
      throw new InternalServerError(
        'Ошибка при регистрации через email: ' + (error as Error).message
      );
    }
  }

  async verifyOtp({
    email,
    code,
    device = UserDevice.ANDROID,
    locationData,
  }: {
    email: string;
    code: string;
    device?: UserDevice;
    locationData?: {
      country?: string;
      city?: string;
      timezone?: string;
    };
  }) {
    try {
      const user = await User.findOne({ email });
      if (!user) throw new NotFoundError('Пользователь не найден');

      const otp = await OtpModel.findOne({
        user: user._id,
        expiresAt: { $gt: new Date() },
      });

      if (!otp) throw new UnauthorizedError('OTP не найден или истек');

      const isMatch = await bcrypt.compare(code, otp.code);
      if (!isMatch) throw new UnauthorizedError('Неверный код подтверждения');

      await OtpModel.findByIdAndDelete(otp._id);

      await userService.updateLoginStats(String(user._id), device, locationData);

      const accessToken = tokenService.generateAccessToken(user.email, user.role, String(user._id));
      const refreshToken = await tokenService.generateRefreshToken(
        user.email,
        user.role,
        String(user._id)
      );

      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
        await user.save();
        return { message: 'Email успешно подтвержден', user, accessToken, refreshToken };
      }

      return { message: 'OTP успешно подтвержден', user, accessToken, refreshToken };
    } catch (error) {
      console.error('Ошибка при подтверждении OTP:', error);
      if (error instanceof NotFoundError) throw error;
      if (error instanceof UnauthorizedError) throw error;
      if (error instanceof BadRequestError) throw error;
      throw new InternalServerError('Ошибка при подтверждении OTP: ' + (error as Error).message);
    }
  }

  async loginWithPassword({
    email,
    password,
    device = UserDevice.ANDROID,
    locationData,
  }: {
    email: string;
    password: string;
    device?: UserDevice;
    locationData?: {
      country?: string;
      city?: string;
      timezone?: string;
    };
  }) {
    try {
      const user = await User.findOne({ email });
      if (!user || !user.password) throw new UnauthorizedError('Неверный email или пароль');
      if (!user.isBlocked) throw new UnauthorizedError('Пользователь заблокирован');
      if (!user.isEmailVerified) throw new UnauthorizedError('Email не подтвержден');
      if (user.isBlocked) throw new UnauthorizedError('Пользователь заблокирован');
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) throw new UnauthorizedError('Неверный email или пароль');

      await userService.updateLoginStats(String(user._id), device, locationData);

      const accessToken = tokenService.generateAccessToken(user.email, user.role, String(user._id));
      const refreshToken = await tokenService.generateRefreshToken(
        user.email,
        user.role,
        String(user._id)
      );
      return { user, accessToken, refreshToken };
    } catch (error) {
      console.error('Ошибка при входе по паролю:', error);
      if (error instanceof NotFoundError) throw error;
      if (error instanceof UnauthorizedError) throw error;
      if (error instanceof BadRequestError) throw error;
      throw new InternalServerError('Ошибка при входе по паролю: ' + (error as Error).message);
    }
  }

  async requestPasswordReset(email: string) {
    try {
      const user = await User.findOne({ email });
      if (!user) throw new NotFoundError('Пользователь не найден');
      await this.sendOtpToEmail(email);
      return { message: 'OTP для сброса пароля отправлен на email' };
    } catch (error) {
      console.error('Ошибка при отправке OTP для сброса пароля:', error);
      if (error instanceof NotFoundError) throw error;
      throw new InternalServerError(
        'Ошибка при отправке OTP для сброса пароля: ' + (error as Error).message
      );
    }
  }

  async resetPasswordWithOtp({
    email,
    code,
    newPassword,
    device = UserDevice.ANDROID,
    locationData,
  }: {
    email: string;
    code: string;
    newPassword: string;
    device?: UserDevice;
    locationData?: {
      country?: string;
      city?: string;
      timezone?: string;
    };
  }) {
    try {
      const user = await User.findOne({ email });
      if (!user) throw new NotFoundError('Пользователь не найден');
      const otp = await OtpModel.findOne({
        user: user._id,
        expiresAt: { $gt: new Date() },
      });
      if (!otp) throw new UnauthorizedError('OTP не найден или истек');

      const isMatch = await bcrypt.compare(code, otp.code);
      if (!isMatch) throw new UnauthorizedError('Неверный код подтверждения');

      await OtpModel.findByIdAndDelete(otp._id);

      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();

      await userService.updateLoginStats(String(user._id), device, locationData);

      const accessToken = tokenService.generateAccessToken(user.email, user.role, String(user._id));
      const refreshToken = await tokenService.generateRefreshToken(
        user.email,
        user.role,
        String(user._id)
      );

      return { message: 'Пароль успешно сброшен', user, accessToken, refreshToken };
    } catch (error) {
      console.error('Ошибка при сбросе пароля:', error);
      if (error instanceof NotFoundError) throw error;
      if (error instanceof UnauthorizedError) throw error;
      if (error instanceof BadRequestError) throw error;
      throw new InternalServerError('Ошибка при сбросе пароля: ' + (error as Error).message);
    }
  }

  async signUpWithGoogle({
    idToken,
    device = UserDevice.ANDROID,
    locationData,
  }: {
    idToken: string;
    device?: UserDevice;
    locationData?: {
      country?: string;
      city?: string;
      timezone?: string;
    };
  }) {
    try {
      const ticket = await googleClient.verifyIdToken({ idToken, audience: config.googleClientId });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) throw new UnauthorizedError('Google токен невалиден');
      let user = await User.findOne({ googleId: payload.sub });
      if (user?.isBlocked) throw new UnauthorizedError('Пользователь заблокирован');
      if (!user) {
        user = await User.create({
          name: payload.given_name || '',
          surname: payload.family_name || '',
          email: payload.email,
          googleId: payload.sub,
          isEmailVerified: payload.email_verified,
          role: UserRole.USER,
        });
      }

      await userService.updateLoginStats(String(user._id), device, locationData);

      const accessToken = tokenService.generateAccessToken(user.email, user.role, String(user._id));
      const refreshToken = await tokenService.generateRefreshToken(
        user.email,
        user.role,
        String(user._id)
      );
      return { user, accessToken, refreshToken };
    } catch (error) {
      console.error('Ошибка при регистрации через Google:', error);
      if (error instanceof NotFoundError) throw error;
      if (error instanceof UnauthorizedError) throw error;
      if (error instanceof BadRequestError) throw error;
      throw new InternalServerError(
        'Ошибка при регистрации через Google: ' + (error as Error).message
      );
    }
  }

  async signUpWithApple({
    idToken,
    device = UserDevice.ANDROID,
    locationData,
  }: {
    idToken: string;
    device?: UserDevice;
    locationData?: {
      country?: string;
      city?: string;
      timezone?: string;
    };
  }) {
    try {
      let payload;
      try {
        payload = await verifyAppleToken({ idToken, clientId: config.appleClientId });
      } catch (e) {
        throw new UnauthorizedError('Apple токен невалиден');
      }
      if (!payload.sub || !payload.email) throw new UnauthorizedError('Apple токен невалиден');
      let user = await User.findOne({ appleId: payload.sub });
      if (user?.isBlocked) throw new UnauthorizedError('Пользователь заблокирован');
      if (!user) {
        user = await User.create({
          name: payload.firstName || '',
          surname: payload.lastName || '',
          email: payload.email,
          appleId: payload.sub,
          isEmailVerified: true,
          role: UserRole.USER,
        });
      }

      await userService.updateLoginStats(String(user._id), device, locationData);

      const accessToken = tokenService.generateAccessToken(user.email, user.role, String(user._id));
      const refreshToken = await tokenService.generateRefreshToken(
        user.email,
        user.role,
        String(user._id)
      );
      return { user, accessToken, refreshToken };
    } catch (error) {
      console.error('Ошибка при регистрации через Apple:', error);
      if (error instanceof NotFoundError) throw error;
      if (error instanceof UnauthorizedError) throw error;
      if (error instanceof BadRequestError) throw error;
      throw new InternalServerError(
        'Ошибка при регистрации через Apple: ' + (error as Error).message
      );
    }
  }

  async logout(userId: string) {
    try {
      await tokenService.deleteRefreshToken(userId);
      await userService.updateLogoutStats(userId);
      return { message: 'Выход выполнен успешно' };
    } catch (error) {
      console.error('Ошибка при выходе:', error);
      if (error instanceof NotFoundError) throw error;
      if (error instanceof UnauthorizedError) throw error;
      if (error instanceof BadRequestError) throw error;
      throw new InternalServerError('Ошибка при выходе: ' + (error as Error).message);
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = tokenService.verifyRefreshToken(refreshToken);
      const user = await User.findById(payload._id);
      if (!user) throw new UnauthorizedError('Пользователь не найден');
      if (user.isBlocked) throw new UnauthorizedError('Пользователь заблокирован');
      const now = new Date();
      await User.findByIdAndUpdate(user._id, { lastRefresh: now });
      const newAccessToken = tokenService.generateAccessToken(
        user.email,
        user.role,
        String(user._id)
      );
      const newRefreshToken = await tokenService.generateRefreshToken(
        user.email,
        user.role,
        String(user._id)
      );
      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      console.error('Ошибка при обновлении токена:', error);
      if (error instanceof NotFoundError) throw error;
      if (error instanceof UnauthorizedError) throw error;
      if (error instanceof BadRequestError) throw error;
      throw new InternalServerError('Ошибка при обновлении токена: ' + (error as Error).message);
    }
  }

  async sendOtpToEmail(email: string) {
    try {
      const user = await User.findOne({ email });
      if (!user) throw new NotFoundError('Пользователь с таким email не найден');

      await OtpModel.deleteMany({ user: user._id });

      const code = '1234';
      const hashedCode = await bcrypt.hash(code, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await OtpModel.create({
        user: user._id,
        code: hashedCode,
        expiresAt,
      });

      // await sendMail({
      //   to: email,
      //   subject: 'Ваш OTP код',
      //   text: `Ваш OTP код: ${code}`,
      //   html: `<b>Ваш OTP код: ${code}</b>`,
      // });

      return { message: 'OTP код отправлен на email' };
    } catch (error) {
      console.error('Ошибка при отправке OTP:', error);
      if (error instanceof NotFoundError) throw error;
      if (error instanceof UnauthorizedError) throw error;
      if (error instanceof BadRequestError) throw error;
      throw new InternalServerError('Ошибка при отправке OTP: ' + (error as Error).message);
    }
  }

  async resendOtp(email: string) {
    try {
      const user = await User.findOne({ email });
      if (!user) throw new NotFoundError('Пользователь не найден');

      const activeOtp = await OtpModel.findOne({
        user: user._id,
        expiresAt: { $gt: new Date() },
      });

      if (activeOtp) {
        const timeLeft = Math.ceil((activeOtp.expiresAt.getTime() - Date.now()) / 1000);
        if (timeLeft > 0) {
          throw new BadRequestError(
            `Подождите ${Math.floor(timeLeft / 60)} минут перед повторной отправкой кода`
          );
        }

        await OtpModel.findByIdAndDelete(activeOtp._id);
      }

      return await this.sendOtpToEmail(email);
    } catch (error) {
      console.error('Ошибка при повторной отправке OTP:', error);
      if (error instanceof NotFoundError) throw error;
      if (error instanceof UnauthorizedError) throw error;
      if (error instanceof BadRequestError) throw error;
      throw new InternalServerError(
        'Ошибка при повторной отправке OTP: ' + (error as Error).message
      );
    }
  }
}

export const authService = new AuthService();
