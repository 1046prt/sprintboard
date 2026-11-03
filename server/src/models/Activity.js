import mongoose from 'mongoose';
import { ACTIVITY_TYPES } from '../constants.js';

const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    action: { type: String, required: true, maxlength: 400 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ project: 1, createdAt: -1 });
activitySchema.index({ createdAt: -1 });

export default mongoose.model('Activity', activitySchema);
