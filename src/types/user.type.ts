import { Document, Types } from 'mongoose';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export enum UserDevice {
  IOS = 'ios',
  ANDROID = 'android',
}

export interface IUser extends Document {
  name: string;
  surname: string;
  email: string;
  password?: string;
  googleId?: string;
  appleId?: string;

  role: UserRole;
  device?: UserDevice;
  fcmToken?: string;

  lastLogin?: Date;
  loginCount?: number;

  country?: string;
  city?: string;
  timezone?: string;

  adClickCount?: number;
  adRevenueGenerated?: number;

  language?: string;

  interests?: Types.ObjectId[];
  allowPersonalizedAds?: boolean;

  isEmailVerified?: boolean;
  isBlocked?: boolean;

  notificationsEnabled?: boolean;

  lastLogout?: Date;
  lastRefresh?: Date;
  refreshTokenVersion?: number;
  lastProfileUpdate?: Date;
}
