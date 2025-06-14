class BaseError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string) {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class InternalServerError extends BaseError {
  constructor(message: string) {
    super(message, 500);
    this.name = 'InternalServerError';
  }
}

export class BadRequestError extends BaseError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

export class ConflictError extends BaseError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}
