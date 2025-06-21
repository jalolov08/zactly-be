import { Request, Response, NextFunction } from 'express';
import { TokenPayload, tokenService } from '../services/token.service';
import { UnauthorizedError } from '../utils/errors';

declare global {
  namespace Express {
    interface Request {
      user: TokenPayload;
    }
  }
}

export const handleTokenError = (error: any, res: Response) => {
  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Срок действия токена истек. Пожалуйста, войдите снова.',
    });
  } else {
    res.status(401).json({ error: error.message || 'Ошибка валидации токена' });
  }
};

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return next(new UnauthorizedError('Токен не предоставлен'));
  }

  try {
    const decoded = tokenService.verifyAccessToken(token);

    req.user = decoded;

    next();
  } catch (error) {
    handleTokenError(error, res);
  }
};
