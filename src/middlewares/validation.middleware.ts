import { Request, Response, NextFunction } from 'express';

export const validateFields = (requiredFields: string[], type: 'body' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const field of requiredFields) {
      if (!req.body[field]) {
        res.status(400).json({ error: `Поле ${field} обязательно для заполнения` });
        return;
      }
    }
    next();
  };
};
