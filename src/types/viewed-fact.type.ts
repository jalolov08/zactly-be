import { Document, Types } from 'mongoose';

export interface IViewedFact extends Document {
  userId?: Types.ObjectId;
  anonId?: string;
  factId: Types.ObjectId;
  viewedAt: Date;
}
