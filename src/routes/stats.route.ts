import { Router } from 'express';
import { statsController } from '../controllers/stats.controller';

export const statsRouter = Router();

statsRouter.get('/all', statsController.getAllStats);
statsRouter.get('/dashboard', statsController.getDashboardSummary);

statsRouter.get('/active-users-month', statsController.getActiveUsersThisMonth);
statsRouter.get('/total-users', statsController.getTotalUsers);
statsRouter.get('/total-ad-clicks', statsController.getTotalAdClicks);
statsRouter.get('/total-categories', statsController.getTotalCategories);
statsRouter.get('/total-facts', statsController.getTotalFacts);

statsRouter.get('/top-categories', statsController.getTopCategoriesByViews);
statsRouter.get('/top-facts', statsController.getTopFactsByViews);
statsRouter.get('/top-active-users', statsController.getTopActiveUsers);

statsRouter.get('/user-ad-click-activity', statsController.getUserAdClickActivity);
statsRouter.get('/user-view-activity', statsController.getUserViewActivity);
statsRouter.get('/user-comprehensive-activity', statsController.getUserComprehensiveActivity);

statsRouter.get('/daily-activity', statsController.getDailyActivityStats);
statsRouter.get('/hourly-activity', statsController.getHourlyActivityStats);
