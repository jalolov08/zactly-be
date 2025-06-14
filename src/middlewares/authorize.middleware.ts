import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Токен не предоставлен или недействителен' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError('У вас нет прав для доступа к этому ресурсу'));
      return;
    }

    next();
  };
};
