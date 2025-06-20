import { config } from '../config';
import { Token } from '../models/token.model';
import { UserRole } from '../types/user.type';
import jwt, { JwtPayload } from 'jsonwebtoken';

export interface TokenPayload extends JwtPayload {
  username: string;
  role: UserRole;
  _id: string;
}

class TokenService {
  private verifyToken(token: string, secret: string): TokenPayload {
    try {
      return jwt.verify(token, secret) as TokenPayload;
    } catch (error) {
      const errorMessage =
        error instanceof jwt.TokenExpiredError
          ? 'Токен истек'
          : error instanceof jwt.JsonWebTokenError
            ? 'Невалидный токен'
            : 'Ошибка при проверке токена';
      throw new Error(errorMessage);
    }
  }

  generateAccessToken(username: string, role: UserRole, _id: string): string {
    const payload: TokenPayload = { username, role, _id };
    return jwt.sign(payload, config.jwtAccessSecret, { expiresIn: '30m' });
  }

  async generateRefreshToken(username: string, role: UserRole, _id: string): Promise<string> {
    const payload: TokenPayload = { username, role, _id };
    const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, {
      expiresIn: '30d',
    });

    try {
      await Token.findOneAndUpdate({ userId: _id }, { refreshToken }, { upsert: true, new: true });
    } catch (error) {
      console.error('Error saving refresh token:', error);
      throw new Error('Ошибка при сохранении или обновлении refresh токена в базу данных');
    }

    return refreshToken;
  }

  verifyAccessToken(token: string): TokenPayload {
    return this.verifyToken(token, config.jwtAccessSecret);
  }

  verifyRefreshToken(token: string): TokenPayload {
    return this.verifyToken(token, config.jwtRefreshSecret);
  }

  async deleteRefreshToken(userId: string): Promise<{ message: string }> {
    try {
      const result = await Token.findOneAndDelete({ userId });

      if (!result) {
        throw new Error('Не удалось найти или удалить refresh токен');
      }

      return { message: 'Refresh токен успешно удален' };
    } catch (error) {
      console.error('Error deleting refresh token:', error);
      throw new Error(error.message);
    }
  }
}

export const tokenService = new TokenService();
