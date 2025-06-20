import { User } from '../models/user.model';
import { IUser, UserDevice } from '../types/user.type';
import { NotFoundError, InternalServerError, BadRequestError } from '../utils/errors';
import { MongooseQueryOptions, Types } from 'mongoose';

class UserService {
  private readonly MAX_INTERESTS = 5;

  async getUser(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('Пользователь не найден.');
    }

    return user;
  }

  async getMe(userId: string) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new NotFoundError('Пользователь не найден');
      return user;
    } catch (error) {
      console.error('Ошибка при получении пользователя:', error);
      if (error instanceof NotFoundError) throw error;
      throw new InternalServerError(
        'Ошибка при получении пользователя: ' + (error as Error).message
      );
    }
  }

  async updateUser(userId: string, updateData: Partial<IUser>) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          ...updateData,
          lastProfileUpdate: new Date(),
        },
        { new: true }
      );
      if (!user) throw new NotFoundError('Пользователь не найден');
      return user;
    } catch (error) {
      console.error('Ошибка при обновлении пользователя:', error);
      if (error instanceof NotFoundError) throw error;
      throw new InternalServerError(
        'Ошибка при обновлении пользователя: ' + (error as Error).message
      );
    }
  }

  async deleteUser(userId: string) {
    try {
      const user = await User.findByIdAndDelete(userId);
      if (!user) throw new NotFoundError('Пользователь не найден');
      return user;
    } catch (error) {
      console.error('Ошибка при удалении пользователя:', error);
      if (error instanceof NotFoundError) throw error;
      throw new InternalServerError(
        'Ошибка при удалении пользователя: ' + (error as Error).message
      );
    }
  }

  async updateInterests(userId: string, categoryIds: string[]) {
    try {
      if (categoryIds.length > this.MAX_INTERESTS) {
        throw new BadRequestError(`Максимальное количество категорий: ${this.MAX_INTERESTS}`);
      }

      const invalidIds = categoryIds.filter((id) => !Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        throw new BadRequestError('Неверный формат ID категории');
      }

      const uniqueIds = [...new Set(categoryIds)];
      if (uniqueIds.length !== categoryIds.length) {
        throw new BadRequestError('Категории не должны повторяться');
      }

      const user = await User.findByIdAndUpdate(
        userId,
        {
          interests: uniqueIds,
          lastProfileUpdate: new Date(),
        },
        { new: true }
      );

      if (!user) throw new NotFoundError('Пользователь не найден');
      return user;
    } catch (error) {
      console.error('Ошибка при обновлении категорий:', error);
      if (error instanceof NotFoundError || error instanceof BadRequestError) throw error;
      throw new InternalServerError('Ошибка при обновлении категорий: ' + (error as Error).message);
    }
  }

  async updateNotifications(userId: string, notifications: boolean) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          notificationsEnabled: notifications,
          lastProfileUpdate: new Date(),
        },
        { new: true }
      );
      if (!user) throw new NotFoundError('Пользователь не найден');
      return user;
    } catch (error) {
      console.error('Ошибка при обновлении уведомлений пользователя:', error);
      if (error instanceof NotFoundError) throw error;
      throw new InternalServerError(
        'Ошибка при обновлении уведомлений пользователя: ' + (error as Error).message
      );
    }
  }

  async updateDevice(userId: string, device: UserDevice) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          device,
          lastProfileUpdate: new Date(),
        },
        { new: true }
      );
      if (!user) throw new NotFoundError('Пользователь не найден');
      return user;
    } catch (error) {
      console.error('Ошибка при обновлении устройства пользователя:', error);
      if (error instanceof NotFoundError) throw error;
      throw new InternalServerError(
        'Ошибка при обновлении устройства пользователя: ' + (error as Error).message
      );
    }
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          fcmToken,
          lastProfileUpdate: new Date(),
        },
        { new: true }
      );
      if (!user) throw new NotFoundError('Пользователь не найден');
      return user;
    } catch (error) {
      console.error('Ошибка при обновлении FCM токена пользователя:', error);
      if (error instanceof NotFoundError) throw error;
      throw new InternalServerError(
        'Ошибка при обновлении FCM токена пользователя: ' + (error as Error).message
      );
    }
  }

  async updatePersonalizedAds(userId: string, allowPersonalizedAds: boolean) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          allowPersonalizedAds,
          lastProfileUpdate: new Date(),
        },
        { new: true }
      );
      if (!user) throw new NotFoundError('Пользователь не найден');
      return user;
    } catch (error) {
      console.error('Ошибка при обновлении персонализированной рекламы пользователя:', error);
      if (error instanceof NotFoundError) throw error;
      throw new InternalServerError(
        'Ошибка при обновлении персонализированной рекламы пользователя: ' +
          (error as Error).message
      );
    }
  }

  async updateLoginStats(
    userId: string,
    device: UserDevice,
    locationData?: {
      country?: string;
      city?: string;
      timezone?: string;
    }
  ) {
    try {
      const updateData: any = {
        lastLogin: new Date(),
        device,
        lastProfileUpdate: new Date(),
      };

      updateData.$inc = { loginCount: 1 };

      if (locationData) {
        if (locationData.country) updateData.country = locationData.country;
        if (locationData.city) updateData.city = locationData.city;
        if (locationData.timezone) updateData.timezone = locationData.timezone;
      }

      const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
      if (!user) throw new NotFoundError('Пользователь не найден');
      return user;
    } catch (error) {
      console.error('Ошибка при обновлении статистики входа:', error);
      if (error instanceof NotFoundError) throw error;
      throw new InternalServerError(
        'Ошибка при обновлении статистики входа: ' + (error as Error).message
      );
    }
  }

  async updateLogoutStats(userId: string) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          lastLogout: new Date(),
          lastProfileUpdate: new Date(),
        },
        { new: true }
      );
      if (!user) throw new NotFoundError('Пользователь не найден');
      return user;
    } catch (error) {
      console.error('Ошибка при обновлении статистики выхода:', error);
      if (error instanceof NotFoundError) throw error;
      throw new InternalServerError(
        'Ошибка при обновлении статистики выхода: ' + (error as Error).message
      );
    }
  }

  async incrementAdClickCount(userId: string) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          $inc: { adClickCount: 1 },
          lastProfileUpdate: new Date(),
        },
        { new: true }
      );
      if (!user) throw new NotFoundError('Пользователь не найден');
      return user;
    } catch (error) {
      console.error('Ошибка при инкременте кликов по рекламе:', error);
      if (error instanceof NotFoundError) throw error;
      throw new InternalServerError(
        'Ошибка при инкременте кликов по рекламе: ' + (error as Error).message
      );
    }
  }

  async getUsers(page: number, limit: number, search?: string, device?: UserDevice) {
    try {
      const query: MongooseQueryOptions = {};

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      if (Object.values(UserDevice).includes(device as UserDevice)) {
        query.device = device;
      }

      const users = await User.find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('interests', 'name')
        .exec();

      const total = await User.countDocuments(query);
      return { users, total };
    } catch (error) {
      console.error('Ошибка при получении пользователей:', error);
      throw new InternalServerError(
        'Ошибка при получении пользователей: ' + (error as Error).message
      );
    }
  }

  async toggleUserBlock(userId: string, isBlocked: boolean) {
    try {
      const user = await User.findByIdAndUpdate(userId, { isBlocked }, { new: true });
      if (!user) throw new NotFoundError('Пользователь не найден');
      return user;
    } catch (error) {
      console.error('Ошибка при блокировке пользователя:', error);
      if (error instanceof NotFoundError) throw error;
      throw new InternalServerError(
        'Ошибка при блокировке пользователя: ' + (error as Error).message
      );
    }
  }
}

export const userService = new UserService();
