import { UserModel } from '../models/user.model';
import { tokenService } from './token.service';
import { UserRole } from '../types/user.type';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import verifyAppleToken from 'verify-apple-id-token';
import {
  ConflictError,
  UnauthorizedError,
  InternalServerError,
  NotFoundError,
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
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) throw new ConflictError('Пользователь с таким email уже существует');
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await UserModel.create({
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
      throw new InternalServerError(
        'Ошибка при регистрации через email: ' + (error as Error).message
      );
    }
  }

  async verifyOtp({ email, code }: { email: string; code: string }) {
    try {
      const user = await UserModel.findOne({ email });
      if (!user) throw new NotFoundError('Пользователь не найден');
      const otp = await OtpModel.findOne({
        user: user._id,
        code,
        used: false,
        expiresAt: { $gt: new Date() },
      });
      if (!otp) throw new UnauthorizedError('OTP не найден или истек');
      otp.used = true;
      await otp.save();

      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
        await user.save();
        return { message: 'Email успешно подтвержден' };
      }
      return { message: 'OTP успешно подтвержден' };
    } catch (error) {
      throw new InternalServerError('Ошибка при подтверждении OTP: ' + (error as Error).message);
    }
  }

  async loginWithPassword({ email, password }: { email: string; password: string }) {
    try {
      const user = await UserModel.findOne({ email });
      if (!user || !user.password) throw new UnauthorizedError('Неверный email или пароль');
      if (!user.isEmailVerified) throw new UnauthorizedError('Email не подтвержден');
      if (user.isBlocked) throw new UnauthorizedError('Пользователь заблокирован');
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) throw new UnauthorizedError('Неверный email или пароль');
      const accessToken = tokenService.generateAccessToken(user.email, user.role, String(user._id));
      const refreshToken = await tokenService.generateRefreshToken(
        user.email,
        user.role,
        String(user._id)
      );
      return { user, accessToken, refreshToken };
    } catch (error) {
      throw new InternalServerError('Ошибка при входе по паролю: ' + (error as Error).message);
    }
  }

  async requestPasswordReset(email: string) {
    try {
      const user = await UserModel.findOne({ email });
      if (!user) throw new NotFoundError('Пользователь не найден');
      await this.sendOtpToEmail(email);
      return { message: 'OTP для сброса пароля отправлен на email' };
    } catch (error) {
      throw new InternalServerError(
        'Ошибка при отправке OTP для сброса пароля: ' + (error as Error).message
      );
    }
  }

  async resetPasswordWithOtp({
    email,
    code,
    newPassword,
  }: {
    email: string;
    code: string;
    newPassword: string;
  }) {
    try {
      const user = await UserModel.findOne({ email });
      if (!user) throw new NotFoundError('Пользователь не найден');
      const otp = await OtpModel.findOne({
        user: user._id,
        code,
        used: false,
        expiresAt: { $gt: new Date() },
      });
      if (!otp) throw new UnauthorizedError('OTP не найден или истек');
      otp.used = true;
      await otp.save();
      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
      return { message: 'Пароль успешно сброшен' };
    } catch (error) {
      throw new InternalServerError('Ошибка при сбросе пароля: ' + (error as Error).message);
    }
  }

  async signUpWithGoogle({ idToken }: { idToken: string }) {
    try {
      const ticket = await googleClient.verifyIdToken({ idToken, audience: config.googleClientId });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) throw new UnauthorizedError('Google токен невалиден');
      let user = await UserModel.findOne({ googleId: payload.sub });
      if (!user) {
        user = await UserModel.create({
          name: payload.given_name || '',
          surname: payload.family_name || '',
          email: payload.email,
          googleId: payload.sub,
          isEmailVerified: payload.email_verified,
          role: UserRole.USER,
        });
      }
      const accessToken = tokenService.generateAccessToken(user.email, user.role, String(user._id));
      const refreshToken = await tokenService.generateRefreshToken(
        user.email,
        user.role,
        String(user._id)
      );
      return { user, accessToken, refreshToken };
    } catch (error) {
      throw new InternalServerError(
        'Ошибка при регистрации через Google: ' + (error as Error).message
      );
    }
  }

  async signUpWithApple({ idToken }: { idToken: string }) {
    try {
      let payload;
      try {
        payload = await verifyAppleToken({ idToken, clientId: config.appleClientId });
      } catch (e) {
        throw new UnauthorizedError('Apple токен невалиден');
      }
      if (!payload.sub || !payload.email) throw new UnauthorizedError('Apple токен невалиден');
      let user = await UserModel.findOne({ appleId: payload.sub });
      if (!user) {
        user = await UserModel.create({
          name: payload.firstName || '',
          surname: payload.lastName || '',
          email: payload.email,
          appleId: payload.sub,
          isEmailVerified: true,
          role: UserRole.USER,
        });
      }
      const accessToken = tokenService.generateAccessToken(user.email, user.role, String(user._id));
      const refreshToken = await tokenService.generateRefreshToken(
        user.email,
        user.role,
        String(user._id)
      );
      return { user, accessToken, refreshToken };
    } catch (error) {
      throw new InternalServerError(
        'Ошибка при регистрации через Apple: ' + (error as Error).message
      );
    }
  }

  async logout(userId: string) {
    try {
      await tokenService.deleteRefreshToken(userId);
      await UserModel.findByIdAndUpdate(userId, { lastLogout: new Date() });
      return { message: 'Выход выполнен успешно' };
    } catch (error) {
      throw new InternalServerError('Ошибка при выходе: ' + (error as Error).message);
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = tokenService.verifyRefreshToken(refreshToken);
      const user = await UserModel.findById(payload._id);
      if (!user) throw new UnauthorizedError('Пользователь не найден');
      const now = new Date();
      await UserModel.findByIdAndUpdate(user._id, { lastRefresh: now });
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
      throw new InternalServerError('Ошибка при обновлении токена: ' + (error as Error).message);
    }
  }

  async sendOtpToEmail(email: string) {
    try {
      const user = await UserModel.findOne({ email });
      if (!user) throw new NotFoundError('Пользователь с таким email не найден');

      const code = 123456;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await OtpModel.create({ user: user._id, code, expiresAt, used: false });
      await sendMail({
        to: email,
        subject: 'Ваш OTP код',
        text: `Ваш OTP код: ${code}`,
        html: `<b>Ваш OTP код: ${code}</b>`,
      });
      return { message: 'OTP код отправлен на email' };
    } catch (error) {
      throw new InternalServerError('Ошибка при отправке OTP: ' + (error as Error).message);
    }
  }
}

export const authService = new AuthService();
