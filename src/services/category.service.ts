import { Category } from '../models/category.model';
import { ICategory } from '../types/category.type';
import { FilterQuery, Types } from 'mongoose';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
  InternalServerError,
} from '../utils/errors';
import { redisService } from './redis.service';

interface MongoError extends Error {
  code?: number;
}

class CategoryService {
  private readonly CACHE_TTL = 3600;
  private readonly CACHE_PREFIX = 'category:';

  private getCacheKey(id: string): string {
    return `${this.CACHE_PREFIX}${id}`;
  }

  private getListCacheKey(query: any = {}): string {
    return `${this.CACHE_PREFIX}list:${JSON.stringify(query)}`;
  }

  private async invalidateCache(id?: string): Promise<void> {
    if (id) {
      await redisService.del(this.getCacheKey(id));
    }

    const keys = await redisService.getKeys(`${this.CACHE_PREFIX}list:*`);
    await redisService.deleteKeys(keys);
  }

  async create(data: Partial<ICategory>): Promise<ICategory> {
    try {
      const category = new Category(data);
      const savedCategory = await category.save();
      await this.invalidateCache();
      return savedCategory;
    } catch (error) {
      const mongoError = error as MongoError;
      if (mongoError.code === 11000) {
        throw new ConflictError('Категория с таким названием уже существует');
      }
      throw new InternalServerError('Не удалось создать категорию');
    }
  }

  async findAll(query: FilterQuery<ICategory> = {}): Promise<ICategory[]> {
    try {
      const cacheKey = this.getListCacheKey(query);
      const cachedData = await redisService.get<ICategory[]>(cacheKey);

      if (cachedData) {
        return cachedData;
      }

      const categories = await Category.find(query).sort({ sortOrder: 1 });
      await redisService.set(cacheKey, categories, this.CACHE_TTL);
      return categories;
    } catch (error) {
      throw new InternalServerError('Не удалось получить список категорий');
    }
  }

  async findById(id: string): Promise<ICategory> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Неверный ID категории');
    }

    const cacheKey = this.getCacheKey(id);
    const cachedCategory = await redisService.get<ICategory>(cacheKey);

    if (cachedCategory) {
      return cachedCategory;
    }

    const category = await Category.findById(id);
    if (!category) {
      throw new NotFoundError('Категория не найдена');
    }

    await redisService.set(cacheKey, category, this.CACHE_TTL);
    return category;
  }

  async update(id: string, data: Partial<ICategory>): Promise<ICategory> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestError('Неверный ID категории');
      }

      const category = await Category.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      );

      if (!category) {
        throw new NotFoundError('Категория не найдена');
      }

      await this.invalidateCache(id);
      return category;
    } catch (error) {
      const mongoError = error as MongoError;
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      if (mongoError.code === 11000) {
        throw new ConflictError('Категория с таким названием уже существует');
      }
      throw new InternalServerError('Не удалось обновить категорию');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestError('Неверный ID категории');
      }

      const category = await Category.findByIdAndDelete(id);
      if (!category) {
        throw new NotFoundError('Категория не найдена');
      }

      await this.invalidateCache(id);
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      throw new InternalServerError('Не удалось удалить категорию');
    }
  }

  async getActiveCategories(): Promise<ICategory[]> {
    try {
      const cacheKey = this.getListCacheKey({ isActive: true });
      const cachedData = await redisService.get<ICategory[]>(cacheKey);

      if (cachedData) {
        return cachedData;
      }

      const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 });
      await redisService.set(cacheKey, categories, this.CACHE_TTL);
      return categories;
    } catch (error) {
      throw new InternalServerError('Не удалось получить список активных категорий');
    }
  }
}

export const categoryService = new CategoryService();
