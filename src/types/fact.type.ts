import { Document, Types } from 'mongoose';

export interface IFact extends Document {
  title: string;
  description: string;
  category: Types.ObjectId;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
