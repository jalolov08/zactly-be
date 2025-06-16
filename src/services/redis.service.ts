import Redis from 'ioredis';
import { redisConfig } from '../config/redis.config';

class RedisService {
  private redis: Redis | null = null;

  constructor() {}

  async init(): Promise<void> {
    if (this.redis) {
      console.log('Redis уже инициализирован');
      return;
    }

    try {
      this.redis = new Redis(redisConfig);

      this.redis.on('error', (error) => {
        console.error('Ошибка подключения к Redis:', error);
      });

      this.redis.on('connect', () => {
        console.log('успешно подключено к Redis');
      });
    } catch (error) {
      console.error('Ошибка инициализации Redis:', error);
      throw error;
    }
  }

  private getClient(): Redis {
    if (!this.redis) {
      throw new Error('Redis клиент не инициализирован');
    }
    return this.redis;
  }

  async getKeys(pattern: string): Promise<string[]> {
    return await this.getClient().keys(pattern);
  }

  async deleteKeys(keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.getClient().del(...keys);
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const stringValue = JSON.stringify(value);
    if (ttl) {
      await this.getClient().setex(key, ttl, stringValue);
    } else {
      await this.getClient().set(key, stringValue);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.getClient().get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Ошибка парсинга значения Redis:', error);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    await this.getClient().del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.getClient().exists(key);
    return result === 1;
  }

  async flush(): Promise<void> {
    await this.getClient().flushall();
  }

  async quit(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}

export const redisService = new RedisService();
