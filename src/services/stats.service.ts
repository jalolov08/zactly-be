import { User } from '../models/user.model';
import { ViewedFact } from '../models/viewed-fact.model';
import { Category } from '../models/category.model';
import { Fact } from '../models/fact.model';

class StatsService {
  async getActiveUsersThisMonth(): Promise<number> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      const count = await User.countDocuments({
        lastLogin: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      });

      return count;
    } catch (error) {
      console.error('Error getting active users this month:', error);
      throw new Error('Failed to get active users count for this month');
    }
  }

  async getTotalUsers(): Promise<number> {
    try {
      return await User.countDocuments();
    } catch (error) {
      console.error('Error getting total users:', error);
      throw new Error('Failed to get total users count');
    }
  }

  async getTotalAdClicks(): Promise<number> {
    try {
      const result = await User.aggregate([
        {
          $group: {
            _id: null,
            totalClicks: { $sum: '$adClickCount' },
          },
        },
      ]);

      return result.length > 0 ? result[0].totalClicks : 0;
    } catch (error) {
      console.error('Error getting total ad clicks:', error);
      throw new Error('Failed to get total ad clicks count');
    }
  }

  async getTotalCategories(): Promise<number> {
    try {
      return await Category.countDocuments({ isActive: true });
    } catch (error) {
      console.error('Error getting total categories:', error);
      throw new Error('Failed to get total categories count');
    }
  }

  async getTotalFacts(): Promise<number> {
    try {
      return await Fact.countDocuments();
    } catch (error) {
      console.error('Error getting total facts:', error);
      throw new Error('Failed to get total facts count');
    }
  }

  async getTopCategoriesByViews(limit: number = 10): Promise<any[]> {
    try {
      const result = await ViewedFact.aggregate([
        {
          $lookup: {
            from: 'facts',
            localField: 'factId',
            foreignField: '_id',
            as: 'fact',
          },
        },
        {
          $unwind: '$fact',
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'fact.category',
            foreignField: '_id',
            as: 'category',
          },
        },
        {
          $unwind: '$category',
        },
        {
          $group: {
            _id: '$category._id',
            categoryName: { $first: '$category.name' },
            categoryDescription: { $first: '$category.description' },
            categoryImage: { $first: '$category.image' },
            totalViews: { $sum: 1 },
          },
        },
        {
          $sort: { totalViews: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      return result;
    } catch (error) {
      console.error('Error getting top categories by views:', error);
      throw new Error('Failed to get top categories by views');
    }
  }

  async getTopFactsByViews(limit: number = 10): Promise<any[]> {
    try {
      const result = await ViewedFact.aggregate([
        {
          $lookup: {
            from: 'facts',
            localField: 'factId',
            foreignField: '_id',
            as: 'fact',
          },
        },
        {
          $unwind: '$fact',
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'fact.category',
            foreignField: '_id',
            as: 'category',
          },
        },
        {
          $unwind: '$category',
        },
        {
          $group: {
            _id: '$fact._id',
            title: { $first: '$fact.title' },
            description: { $first: '$fact.description' },
            categoryName: { $first: '$category.name' },
            totalViews: { $sum: 1 },
          },
        },
        {
          $sort: { totalViews: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      return result;
    } catch (error) {
      console.error('Error getting top facts by views:', error);
      throw new Error('Failed to get top facts by views');
    }
  }

  async getTopActiveUsers(limit: number = 10): Promise<any[]> {
    try {
      const result = await User.aggregate([
        {
          $match: {
            isBlocked: { $ne: true },
          },
        },
        {
          $project: {
            name: 1,
            surname: 1,
            email: 1,
            loginCount: 1,
            lastLogin: 1,
            adClickCount: 1,
            activityScore: {
              $add: ['$loginCount', { $multiply: ['$adClickCount', 2] }],
            },
          },
        },
        {
          $sort: { activityScore: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      return result;
    } catch (error) {
      console.error('Error getting top active users:', error);
      throw new Error('Failed to get top active users');
    }
  }

  async getUserAdClickActivity(limit: number = 10): Promise<any[]> {
    try {
      const result = await User.aggregate([
        {
          $match: {
            isBlocked: { $ne: true },
            adClickCount: { $gt: 0 },
          },
        },
        {
          $project: {
            name: 1,
            surname: 1,
            email: 1,
            adClickCount: 1,
            lastLogin: 1,
          },
        },
        {
          $sort: { adClickCount: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      return result;
    } catch (error) {
      console.error('Error getting user ad click activity:', error);
      throw new Error('Failed to get user ad click activity');
    }
  }

  async getUserViewActivity(limit: number = 10): Promise<any[]> {
    try {
      const result = await ViewedFact.aggregate([
        {
          $match: {
            userId: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: '$userId',
            totalViews: { $sum: 1 },
            uniqueFacts: { $addToSet: '$factId' },
            lastViewed: { $max: '$viewedAt' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: '$user',
        },
        {
          $project: {
            name: '$user.name',
            surname: '$user.surname',
            email: '$user.email',
            totalViews: 1,
            uniqueFactsViewed: { $size: '$uniqueFacts' },
            lastViewed: 1,
            avgViewsPerFact: {
              $divide: ['$totalViews', { $size: '$uniqueFacts' }],
            },
          },
        },
        {
          $sort: { totalViews: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      return result;
    } catch (error) {
      console.error('Error getting user view activity:', error);
      throw new Error('Failed to get user view activity');
    }
  }

  async getUserComprehensiveActivity(limit: number = 10): Promise<any[]> {
    try {
      const result = await User.aggregate([
        {
          $match: {
            isBlocked: { $ne: true },
          },
        },
        {
          $lookup: {
            from: 'viewedfacts',
            localField: '_id',
            foreignField: 'userId',
            as: 'views',
          },
        },
        {
          $project: {
            name: 1,
            surname: 1,
            email: 1,
            loginCount: 1,
            adClickCount: 1,
            totalFactViews: { $size: '$views' },
            uniqueFactsViewed: {
              $size: {
                $setUnion: '$views.factId',
              },
            },
            lastLogin: 1,
            lastFactView: { $max: '$views.viewedAt' },
            engagementScore: {
              $add: [
                '$loginCount',
                { $multiply: ['$adClickCount', 3] },
                { $multiply: [{ $size: '$views' }, 0.5] },
              ],
            },
          },
        },
        {
          $sort: { engagementScore: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      return result;
    } catch (error) {
      console.error('Error getting user comprehensive activity:', error);
      throw new Error('Failed to get user comprehensive activity');
    }
  }

  async getDailyActivityStats(days: number = 30): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await ViewedFact.aggregate([
        {
          $match: {
            viewedAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$viewedAt',
              },
            },
            totalViews: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            uniqueFacts: { $addToSet: '$factId' },
          },
        },
        {
          $project: {
            date: '$_id',
            totalViews: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
            uniqueFacts: { $size: '$uniqueFacts' },
          },
        },
        {
          $sort: { date: 1 },
        },
      ]);

      return result;
    } catch (error) {
      console.error('Error getting daily activity stats:', error);
      throw new Error('Failed to get daily activity statistics');
    }
  }

  async getHourlyActivityStats(): Promise<any[]> {
    try {
      const result = await ViewedFact.aggregate([
        {
          $group: {
            _id: {
              $hour: '$viewedAt',
            },
            totalViews: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
          },
        },
        {
          $project: {
            hour: '$_id',
            totalViews: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
          },
        },
        {
          $sort: { hour: 1 },
        },
      ]);

      return result;
    } catch (error) {
      console.error('Error getting hourly activity stats:', error);
      throw new Error('Failed to get hourly activity statistics');
    }
  }

  async getAllStats() {
    try {
      const [
        activeUsersThisMonth,
        totalUsers,
        totalAdClicks,
        totalCategories,
        totalFacts,
        topCategories,
        topFacts,
        topActiveUsers,
        userAdClickActivity,
        userViewActivity,
        userComprehensiveActivity,
      ] = await Promise.all([
        this.getActiveUsersThisMonth(),
        this.getTotalUsers(),
        this.getTotalAdClicks(),
        this.getTotalCategories(),
        this.getTotalFacts(),
        this.getTopCategoriesByViews(),
        this.getTopFactsByViews(),
        this.getTopActiveUsers(),
        this.getUserAdClickActivity(),
        this.getUserViewActivity(),
        this.getUserComprehensiveActivity(),
      ]);

      return {
        activeUsersThisMonth,
        totalUsers,
        totalAdClicks,
        totalCategories,
        totalFacts,
        topCategories,
        topFacts,
        topActiveUsers,
        userAdClickActivity,
        userViewActivity,
        userComprehensiveActivity,
      };
    } catch (error) {
      console.error('Error getting all stats:', error);
      throw new Error('Failed to get comprehensive statistics');
    }
  }
}

export const statsService = new StatsService();
