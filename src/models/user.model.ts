import { Schema, model } from 'mongoose';
import { IUser, UserRole, UserDevice } from '../types/user.type';

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    surname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String },
    appleId: { type: String },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.USER },
    device: { type: String, enum: Object.values(UserDevice) },
    fcmToken: { type: String },
    lastLogin: { type: Date },
    loginCount: { type: Number, default: 0 },
    country: { type: String },
    city: { type: String },
    timezone: { type: String },
    adClickCount: { type: Number, default: 0 },
    adRevenueGenerated: { type: Number, default: 0 },
    language: { type: String },
    interests: { type: [String] },
    allowPersonalizedAds: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    notificationsEnabled: { type: Boolean },
    lastLogout: { type: Date },
    lastRefresh: { type: Date },
    refreshTokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const UserModel = model<IUser>('User', UserSchema);
