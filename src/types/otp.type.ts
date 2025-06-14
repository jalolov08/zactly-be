import { Document, Types } from 'mongoose';

export interface IOtp extends Document {
  user: Types.ObjectId;
  code: string;
  expiresAt: Date;
  used: boolean;
  createdAt?: Date;
}
