import { Schema, model } from 'mongoose';
import { IFact } from '../types/fact.type';

const factSchema = new Schema<IFact>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

factSchema.index({ title: 'text', description: 'text' });
factSchema.index({ category: 1 });

export const Fact = model<IFact>('Fact', factSchema);
