import { Document, Types } from 'mongoose';

export interface IFact extends Document {
  title: string;
  description: string;
  image?: string;
  category: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
