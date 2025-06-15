import { Category } from '../models/category.model';
import { ICategory } from '../types/category.type';
import { Types } from 'mongoose';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
  InternalServerError,
} from '../utils/errors';

interface MongoError extends Error {
  code?: number;
}

class CategoryService {
  async create(data: Partial<ICategory>): Promise<ICategory> {
    try {
      const category = new Category(data);
      return await category.save();
    } catch (error) {
      const mongoError = error as MongoError;
      if (mongoError.code === 11000) {
        throw new ConflictError('Категория с таким названием уже существует');
      }
      throw new InternalServerError('Не удалось создать категорию');
    }
  }

  async findAll(query: any = {}): Promise<ICategory[]> {
    try {
      return await Category.find(query).sort({ sortOrder: 1 });
    } catch (error) {
      throw new InternalServerError('Не удалось получить список категорий');
    }
  }

  async findById(id: string): Promise<ICategory> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Неверный ID категории');
    }

    const category = await Category.findById(id);
    if (!category) {
      throw new NotFoundError('Категория не найдена');
    }

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
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      throw new InternalServerError('Не удалось удалить категорию');
    }
  }

  async getActiveCategories(): Promise<ICategory[]> {
    try {
      return await Category.find({ isActive: true }).sort({ sortOrder: 1 });
    } catch (error) {
      throw new InternalServerError('Не удалось получить список активных категорий');
    }
  }
}

export const categoryService = new CategoryService();
