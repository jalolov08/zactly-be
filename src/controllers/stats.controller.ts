import { Request, Response } from 'express';
import { statsService } from '../services/stats.service';
import { asyncHandler } from '../utils/asyncHandler';

class StatsController {
  getAllStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await statsService.getAllStats();
    res.status(200).json({ success: true, data: stats });
  });

  getActiveUsersThisMonth = asyncHandler(async (req: Request, res: Response) => {
    const count = await statsService.getActiveUsersThisMonth();
    res.status(200).json({ success: true, data: { activeUsersThisMonth: count } });
  });

  getTotalUsers = asyncHandler(async (req: Request, res: Response) => {
    const count = await statsService.getTotalUsers();
    res.status(200).json({ success: true, data: { totalUsers: count } });
  });

  getTotalAdClicks = asyncHandler(async (req: Request, res: Response) => {
    const count = await statsService.getTotalAdClicks();
    res.status(200).json({ success: true, data: { totalAdClicks: count } });
  });

  getTotalCategories = asyncHandler(async (req: Request, res: Response) => {
    const count = await statsService.getTotalCategories();
    res.status(200).json({ success: true, data: { totalCategories: count } });
  });

  getTotalFacts = asyncHandler(async (req: Request, res: Response) => {
    const count = await statsService.getTotalFacts();
    res.status(200).json({ success: true, data: { totalFacts: count } });
  });

  getTopCategoriesByViews = asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const categories = await statsService.getTopCategoriesByViews(limit);
    res.status(200).json({ success: true, data: categories });
  });

  getTopFactsByViews = asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const facts = await statsService.getTopFactsByViews(limit);
    res.status(200).json({ success: true, data: facts });
  });

  getTopActiveUsers = asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const users = await statsService.getTopActiveUsers(limit);
    res.status(200).json({ success: true, data: users });
  });

  getUserAdClickActivity = asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const activity = await statsService.getUserAdClickActivity(limit);
    res.status(200).json({ success: true, data: activity });
  });

  getUserViewActivity = asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const activity = await statsService.getUserViewActivity(limit);
    res.status(200).json({ success: true, data: activity });
  });

  getUserComprehensiveActivity = asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const activity = await statsService.getUserComprehensiveActivity(limit);
    res.status(200).json({ success: true, data: activity });
  });

  getDailyActivityStats = asyncHandler(async (req: Request, res: Response) => {
    const days = req.query.days ? Number(req.query.days) : 30;
    const stats = await statsService.getDailyActivityStats(days);
    res.status(200).json({ success: true, data: stats });
  });

  getHourlyActivityStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await statsService.getHourlyActivityStats();
    res.status(200).json({ success: true, data: stats });
  });

  getDashboardSummary = asyncHandler(async (req: Request, res: Response) => {
    const [activeUsersThisMonth, totalUsers, totalAdClicks, totalCategories, totalFacts] =
      await Promise.all([
        statsService.getActiveUsersThisMonth(),
        statsService.getTotalUsers(),
        statsService.getTotalAdClicks(),
        statsService.getTotalCategories(),
        statsService.getTotalFacts(),
      ]);

    const summary = {
      activeUsersThisMonth,
      totalUsers,
      totalAdClicks,
      totalCategories,
      totalFacts,
      userGrowthRate: totalUsers > 0 ? ((activeUsersThisMonth / totalUsers) * 100).toFixed(2) : 0,
    };

    res.status(200).json({ success: true, data: summary });
  });
}

export const statsController = new StatsController();
