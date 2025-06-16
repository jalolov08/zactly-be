import { Fact } from '../models/fact.model';
import { IFact } from '../types/fact.type';
import { NotFoundError, BadRequestError, InternalServerError } from '../utils/errors';
import { Types } from 'mongoose';
import { User } from '../models/user.model';
import { ViewedFact } from '../models/viewed-fact.model';
import { Category } from '../models/category.model';

class FactService {
  async create(data: Partial<IFact>): Promise<IFact> {
    try {
      const fact = new Fact(data);
      return await fact.save();
    } catch (error) {
      console.error('Ошибка при создании факта:', error);
      throw new InternalServerError('Не удалось создать факт');
    }
  }

  async update(id: string, data: Partial<IFact>): Promise<IFact> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestError('Неверный ID факта');
      }

      const fact = await Fact.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      ).populate('category', 'name');

      if (!fact) {
        throw new NotFoundError('Факт не найден');
      }

      return fact;
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      console.error('Ошибка при обновлении факта:', error);
      throw new InternalServerError('Не удалось обновить факт');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestError('Неверный ID факта');
      }

      const fact = await Fact.findByIdAndDelete(id);
      if (!fact) {
        throw new NotFoundError('Факт не найден');
      }
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      console.error('Ошибка при удалении факта:', error);
      throw new InternalServerError('Не удалось удалить факт');
    }
  }

  async getFacts(
    page: number,
    limit: number,
    search?: string,
    categoryId?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ facts: IFact[]; total: number }> {
    try {
      const query: any = {};

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
        ];
      }

      if (categoryId) {
        if (!Types.ObjectId.isValid(categoryId)) {
          throw new BadRequestError('Неверный ID категории');
        }
        query.category = categoryId;
      }

      const skip = (page - 1) * limit;

      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const [facts, total] = await Promise.all([
        Fact.find(query).populate('category', 'name').sort(sort).skip(skip).limit(limit),
        Fact.countDocuments(query),
      ]);

      return { facts, total };
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      console.error('Ошибка при получении фактов:', error);
      throw new InternalServerError('Не удалось получить факты');
    }
  }

  async markAsViewed(factId: string, userId?: string, anonId?: string): Promise<void> {
    if (!userId && !anonId) {
      throw new BadRequestError('Айди пользователя или анонимный айди обязательны');
    }

    const fact = await Fact.findById(factId);
    if (!fact) {
      throw new NotFoundError('Факт не найден');
    }

    const viewedFact = new ViewedFact({
      factId,
      ...(userId ? { userId } : { anonId }),
      viewedAt: new Date(),
    });

    await viewedFact.save().catch((err) => {
      if (err.code !== 11000) {
        throw err;
      }
    });
  }

  async getFeed(
    limit: number = 10,
    userId?: string,
    anonId?: string
  ): Promise<{ facts: IFact[]; hasMore: boolean }> {
    if (!userId && !anonId) {
      throw new BadRequestError('Айди пользователя или анонимный айди обязательны');
    }

    let facts: IFact[] = [];
    let hasMore = false;

    if (userId || anonId) {
      const user = userId
        ? await User.findById(userId).select('interests').populate('interests', '_id')
        : null;

      if (userId && !user) {
        throw new NotFoundError('Пользователь не найден');
      }

      const viewedFacts = await ViewedFact.find(userId ? { userId } : { anonId })
        .select('factId')
        .lean();
      const viewedFactIds = viewedFacts.map((vf) => vf.factId);

      const unviewedQuery = {
        _id: { $nin: viewedFactIds },
      };

      const unviewedFacts = await Fact.find(unviewedQuery)
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .limit(limit);

      if (unviewedFacts.length < limit) {
        const remainingLimit = limit - unviewedFacts.length;
        const anyFacts = await Fact.find()
          .populate('category', 'name')
          .sort({ createdAt: -1 })
          .limit(remainingLimit);
        facts = [...unviewedFacts, ...anyFacts];
      } else {
        facts = unviewedFacts;
      }
    } else {
      facts = await Fact.find().populate('category', 'name').sort({ createdAt: -1 }).limit(limit);
    }

    hasMore =
      (await Fact.countDocuments({
        _id: { $nin: facts.map((f) => f._id) },
      })) > 0;

    return { facts, hasMore };
  }

  private calculateContentDiversity(facts: IFact[]): number {
    const uniqueCategories = new Set(facts.map((f) => f.category.toString())).size;
    return uniqueCategories / facts.length;
  }

  private calculateTimeRelevance(
    fact: IFact,
    userPatterns: { preferredTimeOfDay: number }
  ): number {
    const factHour = new Date(fact.createdAt).getHours();
    const hourDiff = Math.abs(factHour - userPatterns.preferredTimeOfDay);
    return Math.exp(-hourDiff / 6);
  }

  async getFeedByCategory(
    categoryId: string,
    limit: number = 10,
    userId?: string,
    anonId?: string
  ): Promise<{ facts: IFact[]; hasMore: boolean }> {
    if (!userId && !anonId) {
      throw new BadRequestError('Айди пользователя или анонимный айди обязательны');
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      throw new NotFoundError('Категория не найдена');
    }

    let facts: IFact[] = [];
    let hasMore = false;

    if (userId || anonId) {
      const user = userId
        ? await User.findById(userId).select('interests').populate('interests', '_id')
        : null;

      if (userId && !user) {
        throw new NotFoundError('Пользователь не найден');
      }

      const viewedFacts = await ViewedFact.find(userId ? { userId } : { anonId })
        .select('factId')
        .lean();
      const viewedFactIds = viewedFacts.map((vf) => vf.factId);

      const categoryEngagement = await ViewedFact.aggregate([
        {
          $match: {
            ...(userId ? { userId: new Types.ObjectId(userId) } : { anonId }),
          },
        },
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
          $match: {
            'fact.category': new Types.ObjectId(categoryId),
          },
        },
        {
          $group: {
            _id: null,
            viewCount: { $sum: 1 },
            lastViewed: { $max: '$viewedAt' },
            averageViewDuration: { $avg: '$viewDuration' },
            completionRate: { $avg: '$completionRate' },
          },
        },
      ]);

      let categoryWeight = 0.5;
      if (categoryEngagement.length > 0) {
        const engagement = categoryEngagement[0];
        const timeDecay = Math.exp(
          (-0.1 * (Date.now() - new Date(engagement.lastViewed).getTime())) / (1000 * 60 * 60 * 24)
        );
        const engagementScore =
          engagement.viewCount * 0.4 +
          ((engagement.averageViewDuration || 30) / 60) * 0.3 +
          (engagement.completionRate || 0.7) * 0.3;
        categoryWeight = (engagementScore * timeDecay) / 10;
      }

      const isInterested = user?.interests?.some(
        (interest) => interest._id.toString() === categoryId
      );

      if (isInterested) {
        categoryWeight *= 1.5;
      }

      const userPatterns = await this.getUserViewingPatterns(userId, anonId);

      const unviewedQuery = {
        category: categoryId,
        _id: { $nin: viewedFactIds },
      };

      const unviewedFacts = await Fact.find(unviewedQuery)
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .limit(limit * 3);

      if (unviewedFacts.length < limit) {
        const remainingLimit = limit - unviewedFacts.length;
        const anyFacts = await Fact.find({ category: categoryId })
          .populate('category', 'name')
          .sort({ createdAt: -1 })
          .limit(remainingLimit);
        facts = [...unviewedFacts, ...anyFacts];
      } else {
        const scoredFacts = unviewedFacts.map((fact) => {
          const timeScore = Math.exp(
            (-0.05 * (Date.now() - new Date(fact.createdAt).getTime())) / (1000 * 60 * 60 * 24)
          );
          const timeRelevance = this.calculateTimeRelevance(fact, userPatterns);
          const score = categoryWeight * 0.4 + timeScore * 0.3 + timeRelevance * 0.3;
          return { fact, score };
        });

        scoredFacts.sort((a, b) => b.score - a.score);

        const selectedFacts: { fact: IFact; score: number }[] = [];
        const tempFacts = [...scoredFacts];

        while (selectedFacts.length < limit && tempFacts.length > 0) {
          const currentDiversity = this.calculateContentDiversity(selectedFacts.map((s) => s.fact));
          const nextFact = tempFacts.shift()!;
          const diversityBonus = currentDiversity < 0.3 ? 1.2 : 1;
          nextFact.score *= diversityBonus;
          selectedFacts.push(nextFact);
        }

        facts = selectedFacts.map((item) => item.fact);
      }
    } else {
      facts = await Fact.find({ category: categoryId })
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .limit(limit);
    }

    hasMore =
      (await Fact.countDocuments({
        category: categoryId,
        _id: { $nin: facts.map((f) => f._id) },
      })) > 0;

    return { facts, hasMore };
  }

  private async getUserViewingPatterns(
    userId?: string,
    anonId?: string
  ): Promise<{ preferredTimeOfDay: number; averageViewDuration: number; completionRate: number }> {
    const viewedFacts = await ViewedFact.find(userId ? { userId } : { anonId })
      .sort({ viewedAt: -1 })
      .limit(100);

    if (viewedFacts.length === 0) {
      return {
        preferredTimeOfDay: 12,
        averageViewDuration: 30,
        completionRate: 0.7,
      };
    }

    const hours = viewedFacts.map((vf) => new Date(vf.viewedAt).getHours());
    const hourCounts = hours.reduce(
      (acc, hour) => {
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );
    const preferredTimeOfDay = Object.entries(hourCounts).reduce(
      (max, [hour, count]) => (count > max.count ? { hour: Number(hour), count } : max),
      { hour: 12, count: 0 }
    ).hour;

    return {
      preferredTimeOfDay,
      averageViewDuration: 30,
      completionRate: 0.7,
    };
  }
}

export const factService = new FactService();
