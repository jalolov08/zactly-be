import { IViewedFact } from '../types/viewed-fact.type';
import { Schema, model } from 'mongoose';

const ViewedFactSchema = new Schema<IViewedFact>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    anonId: { type: String },
    factId: { type: Schema.Types.ObjectId, ref: 'Fact', required: true },
    viewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ViewedFactSchema.index({ userId: 1, factId: 1 }, { unique: true, sparse: true });
ViewedFactSchema.index({ anonId: 1, factId: 1 }, { unique: true, sparse: true });

ViewedFactSchema.pre('save', function (next) {
  if (!this.userId && !this.anonId) {
    next(new Error('Айди пользователя или анонимный айди обязательны'));
  }
  next();
});

export const ViewedFact = model<IViewedFact>('ViewedFact', ViewedFactSchema);
