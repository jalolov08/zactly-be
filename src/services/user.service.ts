import { User } from '../models/user.model';
import { IUser, UserDevice } from '../types/user.type';
import { NotFoundError, InternalServerError } from '../utils/errors';

class UserService {
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
      const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
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

  async updateInterests(userId: string, interests: string[]) {
    try {
      const user = await User.findByIdAndUpdate(userId, { interests }, { new: true });
      if (!user) throw new NotFoundError('Пользователь не найден');
      return user;
    } catch (error) {
      console.error('Ошибка при обновлении интересов пользователя:', error);
      if (error instanceof NotFoundError) throw error;
      throw new InternalServerError(
        'Ошибка при обновлении интересов пользователя: ' + (error as Error).message
      );
    }
  }

  async updateNotifications(userId: string, notifications: boolean) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { notificationsEnabled: notifications },
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
      const user = await User.findByIdAndUpdate(userId, { device }, { new: true });
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
      const user = await User.findByIdAndUpdate(userId, { fcmToken }, { new: true });
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
}

export const userService = new UserService();
