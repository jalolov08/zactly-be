import { Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  description: string;
  image: string;

  isActive: boolean;
  sortOrder: number;

  factsCount: number;
}
