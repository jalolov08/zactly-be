import { Schema, model } from 'mongoose';
import { IOtp } from '../types/otp.type';

const OtpSchema = new Schema<IOtp>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const OtpModel = model<IOtp>('Otp', OtpSchema);
