import mongoose from 'mongoose';
import { STATUSES, PRIORITIES } from '../constants.js';

const issueSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    status: { type: String, enum: STATUSES, default: 'todo' },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true }
);

issueSchema.index({ project: 1, status: 1, createdAt: -1 });
issueSchema.index({ status: 1, priority: 1, createdAt: -1 });
issueSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });
issueSchema.index({ createdAt: -1 });

export default mongoose.model('Issue', issueSchema);
