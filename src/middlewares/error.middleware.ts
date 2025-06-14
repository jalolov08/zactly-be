import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
  statusCode?: number;
}

export const errorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction) => {
  const errorMap: { [key: string]: number } = {
    NotFoundError: 404,
    ForbiddenError: 403,
    InternalServerError: 500,
    BadRequestError: 400,
    ConflictError: 409,
  };

  const statusCode = errorMap[err.name] || 500;
  const message = err.message || 'Что-то пошло не так. Попробуйте позже.';

  console.error(err);
  res.status(statusCode).json({ error: message });
  return;
};
