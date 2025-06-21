import { Fact } from '../models/fact.model';
import { IFact } from '../types/fact.type';
import { NotFoundError, BadRequestError, InternalServerError } from '../utils/errors';
import { FilterQuery, Types } from 'mongoose';
import { User } from '../models/user.model';
import { ViewedFact } from '../models/viewed-fact.model';
import { Category } from '../models/category.model';
import { redisService } from './redis.service';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

interface IFactWithViews extends IFact {
  views: number;
}

class FactService {
  private readonly CACHE_TTL = 3600;
  private readonly CACHE_PREFIX = 'fact:';

  private getCacheKey(id: string): string {
    return `${this.CACHE_PREFIX}${id}`;
  }

  private getListCacheKey(params: {
    page: number;
    limit: number;
    search?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    sortBy: string;
    sortOrder: string;
  }): string {
    return `${this.CACHE_PREFIX}list:${JSON.stringify(params)}`;
  }

  private getFeedCacheKey(params: { limit: number; userId?: string; anonId?: string }): string {
    return `${this.CACHE_PREFIX}feed:${JSON.stringify(params)}`;
  }

  private getCategoryFeedCacheKey(params: {
    categoryId: string;
    limit: number;
    userId?: string;
    anonId?: string;
  }): string {
    return `${this.CACHE_PREFIX}category-feed:${JSON.stringify(params)}`;
  }

  private async invalidateCache(id?: string): Promise<void> {
    if (id) {
      await redisService.del(this.getCacheKey(id));
    }

    const patterns = [
      `${this.CACHE_PREFIX}list:*`,
      `${this.CACHE_PREFIX}feed:*`,
      `${this.CACHE_PREFIX}category-feed:*`,
    ];

    for (const pattern of patterns) {
      const keys = await redisService.getKeys(pattern);
      await redisService.deleteKeys(keys);
    }
  }

  private async downloadAndSaveImage(imageUrl: string): Promise<string> {
    try {
      const uploadsDir = path.join(__dirname, '../../uploads/facts');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const fileExtension = this.getFileExtensionFromUrl(imageUrl);
      const filename = `import_${Date.now()}_${Math.random().toString(36).substring(7)}${fileExtension}`;
      const filePath = path.join(uploadsDir, filename);

      fs.writeFileSync(filePath, Buffer.from(response.data as ArrayBuffer));

      return `/uploads/facts/${filename}`;
    } catch (error) {
      console.error('Error downloading image:', error);
      throw new Error(`Не удалось загрузить изображение: ${imageUrl}`);
    }
  }

  private getFileExtensionFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const extension = path.extname(pathname);

      if (
        extension &&
        ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension.toLowerCase())
      ) {
        return extension;
      }

      return '.jpg';
    } catch {
      return '.jpg';
    }
  }

  async create(data: Partial<IFact>): Promise<IFact> {
    try {
      const fact = new Fact(data);
      const savedFact = await fact.save();
      await this.invalidateCache();
      if (data.category) {
        await this.updateCategoryFactsCount(data.category.toString());
      }
      return savedFact;
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

      await this.invalidateCache(id);

      const categoryId = (fact.category as any)._id?.toString() || fact.category.toString();

      await this.updateCategoryFactsCount(categoryId);
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

      await this.invalidateCache(id);

      const categoryId = (fact.category as any)._id?.toString() || fact.category.toString();

      await this.updateCategoryFactsCount(categoryId);
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
    startDate?: string,
    endDate?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ facts: IFactWithViews[]; total: number }> {
    try {
      const cacheKey = this.getListCacheKey({
        page,
        limit,
        search,
        categoryId,
        startDate,
        endDate,
        sortBy,
        sortOrder,
      });
      const cachedData = await redisService.get<{ facts: IFactWithViews[]; total: number }>(
        cacheKey
      );

      if (cachedData) {
        return cachedData;
      }

      const query: FilterQuery<IFact> = {};

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      if (categoryId) {
        if (!Types.ObjectId.isValid(categoryId)) {
          throw new BadRequestError('Неверный ID категории');
        }
        query.category = categoryId;
      }

      if (startDate) {
        query.createdAt = { $gte: startDate };
      }

      if (endDate) {
        query.createdAt = { $lte: endDate };
      }

      const skip = (page - 1) * limit;

      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const facts = await Fact.find(query)
        .populate('category', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Fact.countDocuments(query);

      const factIds = facts.map((fact) => fact._id);
      const viewCounts = await ViewedFact.aggregate([
        {
          $match: {
            factId: { $in: factIds },
          },
        },
        {
          $group: {
            _id: '$factId',
            views: { $sum: 1 },
          },
        },
      ]);

      const viewCountMap = new Map();
      viewCounts.forEach((item) => {
        viewCountMap.set(item._id.toString(), item.views);
      });

      const factsWithViews: IFactWithViews[] = facts.map((fact) => {
        const factWithViews = {
          ...fact,
          views: viewCountMap.get(fact._id.toString()) || 0,
        };
        return factWithViews as unknown as IFactWithViews;
      });

      const result = { facts: factsWithViews, total };
      await redisService.set(cacheKey, result, this.CACHE_TTL);
      return result;
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

    const patterns = [
      `${this.CACHE_PREFIX}feed:*${userId || anonId}*`,
      `${this.CACHE_PREFIX}category-feed:*${userId || anonId}*`,
    ];

    for (const pattern of patterns) {
      const keys = await redisService.getKeys(pattern);
      await redisService.deleteKeys(keys);
    }
  }

  async getFeed(
    limit: number = 10,
    userId?: string,
    anonId?: string
  ): Promise<{ facts: IFact[]; hasMore: boolean }> {
    if (!userId && !anonId) {
      throw new BadRequestError('Айди пользователя или анонимный айди обязательны');
    }

    const cacheKey = this.getFeedCacheKey({ limit, userId, anonId });
    const cachedData = await redisService.get<{ facts: IFact[]; hasMore: boolean }>(cacheKey);

    if (cachedData) {
      return cachedData;
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
        .select('factId viewedAt')
        .lean();
      const viewedFactIds = viewedFacts.map((vf) => vf.factId);

      const userPatterns = await this.getUserViewingPatterns(userId, anonId);
      const categoryPreferences = await this.getCategoryPreferences(userId, anonId);

      const unviewedQuery = {
        _id: { $nin: viewedFactIds },
      };

      const unviewedFacts = await Fact.find(unviewedQuery)
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .limit(limit * 3);

      if (unviewedFacts.length >= limit) {
        const scoredFacts = unviewedFacts.map((fact) => {
          const timeScore = Math.exp(
            (-0.05 * (Date.now() - new Date(fact.createdAt).getTime())) / (1000 * 60 * 60 * 24)
          );
          const timeRelevance = this.calculateTimeRelevance(fact, userPatterns);

          const categoryId = fact.category.toString();
          const categoryWeight = categoryPreferences[categoryId] || 0.5;

          const isInterested = user?.interests?.some(
            (interest) => interest._id.toString() === categoryId
          );

          const finalCategoryWeight = isInterested ? categoryWeight * 1.5 : categoryWeight;

          const score = finalCategoryWeight * 0.4 + timeScore * 0.3 + timeRelevance * 0.3;
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
      } else {
        const remainingLimit = limit - unviewedFacts.length;

        const viewedFactsWithData = await Fact.find({ _id: { $in: viewedFactIds } })
          .populate('category', 'name')
          .lean();

        const viewedAtMap = new Map();
        viewedFacts.forEach((vf) => {
          viewedAtMap.set(vf.factId.toString(), vf.viewedAt);
        });

        const viewedFactsWithViewTime = viewedFactsWithData.map((fact) => ({
          ...fact,
          viewedAt: viewedAtMap.get(fact._id.toString()),
        }));

        viewedFactsWithViewTime.sort(
          (a, b) => new Date(a.viewedAt).getTime() - new Date(b.viewedAt).getTime()
        );

        const oldViewedFacts = viewedFactsWithViewTime.slice(0, remainingLimit * 2);

        const scoredViewedFacts = oldViewedFacts.map((fact) => {
          const timeSinceViewed =
            (Date.now() - new Date(fact.viewedAt).getTime()) / (1000 * 60 * 60 * 24);
          const timeScore = Math.exp(-0.1 * timeSinceViewed);

          const timeRelevance = this.calculateTimeRelevance(fact, userPatterns);

          const categoryId = fact.category.toString();
          const categoryWeight = categoryPreferences[categoryId] || 0.5;

          const isInterested = user?.interests?.some(
            (interest) => interest._id.toString() === categoryId
          );

          const finalCategoryWeight = isInterested ? categoryWeight * 1.5 : categoryWeight;

          const randomness = 0.8 + Math.random() * 0.4;

          const score =
            (finalCategoryWeight * 0.3 + timeScore * 0.4 + timeRelevance * 0.2) * randomness;
          return { fact, score };
        });

        scoredViewedFacts.sort((a, b) => b.score - a.score);

        const selectedViewedFacts = scoredViewedFacts.slice(0, remainingLimit);

        facts = [...unviewedFacts, ...selectedViewedFacts.map((item) => item.fact)];
      }
    } else {
      facts = await Fact.find().populate('category', 'name').sort({ createdAt: -1 }).limit(limit);
    }

    hasMore =
      (await Fact.countDocuments({
        _id: { $nin: facts.map((f) => f._id) },
      })) > 0;

    const result = { facts, hasMore };
    await redisService.set(cacheKey, result, this.CACHE_TTL);
    return result;
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

    const cacheKey = this.getCategoryFeedCacheKey({ categoryId, limit, userId, anonId });
    const cachedData = await redisService.get<{ facts: IFact[]; hasMore: boolean }>(cacheKey);

    if (cachedData) {
      return cachedData;
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
        .select('factId viewedAt')
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

      if (unviewedFacts.length >= limit) {
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
      } else {
        const remainingLimit = limit - unviewedFacts.length;

        const viewedFactsInCategory = viewedFacts.filter((vf) => viewedFactIds.includes(vf.factId));

        const viewedFactsWithData = await Fact.find({
          _id: { $in: viewedFactsInCategory.map((vf) => vf.factId) },
          category: categoryId,
        })
          .populate('category', 'name')
          .lean();

        const viewedAtMap = new Map();
        viewedFactsInCategory.forEach((vf) => {
          viewedAtMap.set(vf.factId.toString(), vf.viewedAt);
        });

        const viewedFactsWithViewTime = viewedFactsWithData.map((fact) => ({
          ...fact,
          viewedAt: viewedAtMap.get(fact._id.toString()),
        }));

        viewedFactsWithViewTime.sort(
          (a, b) => new Date(a.viewedAt).getTime() - new Date(b.viewedAt).getTime()
        );

        const oldViewedFacts = viewedFactsWithViewTime.slice(0, remainingLimit * 2);

        const scoredViewedFacts = oldViewedFacts.map((fact) => {
          const timeSinceViewed =
            (Date.now() - new Date(fact.viewedAt).getTime()) / (1000 * 60 * 60 * 24);
          const timeScore = Math.exp(-0.1 * timeSinceViewed);

          const timeRelevance = this.calculateTimeRelevance(fact, userPatterns);

          const randomness = 0.8 + Math.random() * 0.4;

          const score = (categoryWeight * 0.3 + timeScore * 0.4 + timeRelevance * 0.2) * randomness;
          return { fact, score };
        });

        scoredViewedFacts.sort((a, b) => b.score - a.score);

        const selectedViewedFacts = scoredViewedFacts.slice(0, remainingLimit);

        facts = [...unviewedFacts, ...selectedViewedFacts.map((item) => item.fact)];
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

    const result = { facts, hasMore };
    await redisService.set(cacheKey, result, this.CACHE_TTL);
    return result;
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

  private async getCategoryPreferences(
    userId?: string,
    anonId?: string
  ): Promise<Record<string, number>> {
    const viewedFacts = await ViewedFact.find(userId ? { userId } : { anonId })
      .sort({ viewedAt: -1 })
      .limit(100);

    if (viewedFacts.length === 0) {
      return {};
    }

    const factIds = viewedFacts.map((vf) => vf.factId);
    const facts = await Fact.find({ _id: { $in: factIds } })
      .select('category')
      .populate('category', '_id')
      .lean();

    const categoryCounts: Record<string, number> = {};
    facts.forEach((fact) => {
      const categoryId = fact.category.toString();
      categoryCounts[categoryId] = (categoryCounts[categoryId] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(categoryCounts));
    const preferences: Record<string, number> = {};

    Object.entries(categoryCounts).forEach(([categoryId, count]) => {
      preferences[categoryId] = 0.5 + (count / maxCount) * 1.0;
    });

    return preferences;
  }

  async getFactsCountByCategory(categoryId: string): Promise<number> {
    try {
      if (!Types.ObjectId.isValid(categoryId)) {
        throw new BadRequestError('Неверный ID категории');
      }

      const cacheKey = `${this.CACHE_PREFIX}count:category:${categoryId}`;
      const cachedCount = await redisService.get<number>(cacheKey);

      if (cachedCount !== null) {
        return cachedCount;
      }

      const count = await Fact.countDocuments({ category: categoryId });
      await redisService.set(cacheKey, count, this.CACHE_TTL);
      return count;
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      console.error('Ошибка при получении количества фактов по категории:', error);
      throw new InternalServerError('Не удалось получить количество фактов');
    }
  }

  async getTotalFactsCount(): Promise<number> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}count:total`;
      const cachedCount = await redisService.get<number>(cacheKey);

      if (cachedCount !== null) {
        return cachedCount;
      }

      const count = await Fact.countDocuments();
      await redisService.set(cacheKey, count, this.CACHE_TTL);
      return count;
    } catch (error) {
      console.error('Ошибка при получении общего количества фактов:', error);
      throw new InternalServerError('Не удалось получить общее количество фактов');
    }
  }

  async updateCategoryFactsCount(categoryId: string): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(categoryId)) {
        throw new BadRequestError('Неверный ID категории');
      }

      const count = await Fact.countDocuments({ category: categoryId });
      await Category.findByIdAndUpdate(categoryId, { factsCount: count });

      await redisService.del(`${this.CACHE_PREFIX}count:category:${categoryId}`);
      await redisService.del(`${this.CACHE_PREFIX}count:total`);

      const categoryCacheKeys = await redisService.getKeys('category:*');
      await redisService.deleteKeys(categoryCacheKeys);
    } catch (error) {
      console.error('Ошибка при обновлении количества фактов категории:', error);
      throw new InternalServerError('Не удалось обновить количество фактов категории');
    }
  }

  async recalculateAllCategoryFactsCount(): Promise<void> {
    try {
      const categories = await Category.find();

      for (const category of categories) {
        const count = await Fact.countDocuments({ category: category._id });
        await Category.findByIdAndUpdate(category._id, { factsCount: count });
      }

      const factCacheKeys = await redisService.getKeys(`${this.CACHE_PREFIX}*`);
      const categoryCacheKeys = await redisService.getKeys('category:*');
      await redisService.deleteKeys([...factCacheKeys, ...categoryCacheKeys]);

      console.log('Количество фактов для всех категорий пересчитано');
    } catch (error) {
      console.error('Ошибка при пересчете количества фактов категорий:', error);
      throw new InternalServerError('Не удалось пересчитать количество фактов категорий');
    }
  }

  async importFromExcel(
    data: any[],
    fieldMapping: Record<string, string>
  ): Promise<{ success: number; errors: string[] }> {
    try {
      const results = { success: 0, errors: [] as string[] };

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2;

        try {
          const factData: Partial<IFact> = {};

          if (fieldMapping.title && row[fieldMapping.title]) {
            factData.title = row[fieldMapping.title].toString().trim();
          }

          if (fieldMapping.description && row[fieldMapping.description]) {
            factData.description = row[fieldMapping.description].toString().trim();
          }

          if (fieldMapping.category && row[fieldMapping.category]) {
            const categoryValue = row[fieldMapping.category].toString().trim();
            const category = await Category.findOne({
              $or: [{ name: { $regex: new RegExp(`^${categoryValue}$`, 'i') } }],
            });

            if (category) {
              factData.category = category._id as Types.ObjectId;
            } else {
              results.errors.push(`Строка ${rowNumber}: Категория "${categoryValue}" не найдена`);
              continue;
            }
          }

          if (fieldMapping.image && row[fieldMapping.image]) {
            const imageUrl = row[fieldMapping.image].toString().trim();
            if (imageUrl) {
              try {
                const savedImagePath = await this.downloadAndSaveImage(imageUrl);
                factData.image = savedImagePath;
              } catch (error) {
                results.errors.push(
                  `Строка ${rowNumber}: Ошибка загрузки изображения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
                );
              }
            }
          }

          if (!factData.title || !factData.description || !factData.category) {
            results.errors.push(
              `Строка ${rowNumber}: Отсутствуют обязательные поля (заголовок, описание, категория)`
            );
            continue;
          }

          const fact = new Fact(factData);
          await fact.save();
          results.success++;

          await this.updateCategoryFactsCount(factData.category.toString());
        } catch (error) {
          console.error(`Ошибка при импорте строки ${rowNumber}:`, error);
          results.errors.push(
            `Строка ${rowNumber}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
          );
        }
      }

      await this.invalidateCache();

      return results;
    } catch (error) {
      console.error('Ошибка при импорте из Excel:', error);
      throw new InternalServerError('Не удалось импортировать данные из Excel');
    }
  }
}

export const factService = new FactService();
