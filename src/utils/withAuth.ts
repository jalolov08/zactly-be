import { authenticate } from '../middlewares/authenticate.middleware';
import { authorize } from '../middlewares/authorize.middleware';

export const withAuth = (roles: string[]) => [authenticate, authorize(roles)];
