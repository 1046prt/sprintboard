import Activity from '../models/Activity.js';
import Issue from '../models/Issue.js';
import Project from '../models/Project.js';
import { statsByProject } from '../services/projectStats.js';
import { broadcast } from '../socket.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { assertCanManage } from '../utils/permissions.js';

const owner = { path: 'createdBy', select: 'name email' };

async function findProjectOr404(id) {
  const project = await Project.findById(id);
  if (!project) throw new AppError('Project not found', 404);
  return project;
}

export const listProjects = asyncHandler(async (req, res) => {
  const filter = req.valid.query.mine ? { createdBy: req.user._id } : {};
  const projects = await Project.find(filter).sort({ createdAt: -1 }).populate(owner).lean();

  const stats = await statsByProject(projects.map((p) => p._id));
  res.json({ projects: projects.map((p) => ({ ...p, stats: stats.get(String(p._id)) })) });
});

export const createProject = asyncHandler(async (req, res) => {
  const project = await Project.create({ ...req.valid.body, createdBy: req.user._id });
  await project.populate(owner);

  broadcast(req, 'project:created', { projectId: String(project._id) });
  broadcast(req, 'stats:changed');
  res.status(201).json({ project });
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await findProjectOr404(req.valid.params.id);
  await project.populate(owner);

  const stats = await statsByProject([project._id]);
  res.json({ project: { ...project.toObject(), stats: stats.get(String(project._id)) } });
});

export const updateProject = asyncHandler(async (req, res) => {
  const project = await findProjectOr404(req.valid.params.id);
  assertCanManage(req.user, project.createdBy, 'this project');

  project.set(req.valid.body);
  await project.save();
  await project.populate(owner);

  broadcast(req, 'project:updated', { projectId: String(project._id) });
  res.json({ project });
});

export const deleteProject = asyncHandler(async (req, res) => {
  const project = await findProjectOr404(req.valid.params.id);
  assertCanManage(req.user, project.createdBy, 'this project');

  // Standalone MongoDB has no transactions, so remove the children first.
  // If this fails halfway, the project is still there and the delete can be retried.
  await Issue.deleteMany({ project: project._id });
  await Activity.deleteMany({ project: project._id });
  await project.deleteOne();

  broadcast(req, 'project:deleted', { projectId: String(project._id) });
  broadcast(req, 'stats:changed');
  res.json({ message: 'Project deleted' });
});

export const getProjectActivity = asyncHandler(async (req, res) => {
  const project = await findProjectOr404(req.valid.params.id);
  const { limit } = req.valid.query;

  const activities = await Activity.find({ project: project._id })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .populate('user', 'name')
    .lean();

  res.json({ activities });
});
