import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

projectSchema.index({ createdAt: -1 });

export default mongoose.model('Project', projectSchema);
