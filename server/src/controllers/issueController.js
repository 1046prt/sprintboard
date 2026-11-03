import Issue from '../models/Issue.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { STATUS_LABELS } from '../constants.js';
import { logActivity } from '../services/activityService.js';
import { broadcast } from '../socket.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import escapeRegex from '../utils/escapeRegex.js';
import { getVisibleUserIds } from '../utils/hierarchy.js';
import { canManage } from '../utils/permissions.js';

const populateIssue = [
  { path: 'project', select: 'name createdBy' },
  { path: 'createdBy', select: 'name' },
  { path: 'assignedTo', select: 'name role' },
];

async function findIssueOr404(id) {
  const issue = await Issue.findById(id);
  if (!issue) throw new AppError('Issue not found', 404);
  return issue;
}

// The issue's author, the owner of its project and admins may edit or delete
// it. Moving an issue between statuses is open to everyone (see updateIssue).
async function assertCanEditIssue(user, issue) {
  if (canManage(user, issue.createdBy)) return;
  const project = await Project.findById(issue.project).select('createdBy');
  if (project && canManage(user, project.createdBy)) return;
  throw new AppError('You do not have permission to modify this issue', 403);
}

function notify(req, event, issue) {
  broadcast(req, event, { issueId: String(issue._id), projectId: String(issue.project?._id || issue.project) });
  broadcast(req, 'stats:changed');
}

export const listIssues = asyncHandler(async (req, res) => {
  const { status, priority, project, assignedTo, mine, search, sort, page, limit } = req.valid.query;

  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (project) filter.project = project;
  if (search) filter.title = { $regex: escapeRegex(search), $options: 'i' };

  // ── Hierarchy-based visibility ──────────────────────────────────────────
  // If the caller explicitly requests a specific assignee, respect that only
  // when they are actually allowed to see that person's tasks.
  const visibleIds = await getVisibleUserIds(req.user);

  if (assignedTo) {
    // Explicit filter: only show it if the user is allowed to see that person.
    if (visibleIds !== null && !visibleIds.includes(String(assignedTo))) {
      // The requested assignee is outside the caller's visibility tree.
      return res.json({ issues: [], pagination: { page, limit, total: 0, pages: 1 } });
    }
    filter.assignedTo = assignedTo;
  } else if (mine || visibleIds !== null) {
    // No explicit assignee filter, but the user isn't an admin:
    // scope results to their visible set.
    const ids = mine ? [String(req.user._id)] : visibleIds;
    if (ids !== null) {
      filter.$or = [
        { assignedTo: { $in: ids } },
        { createdBy: req.user._id },
      ];
    }
  }
  // visibleIds === null (admin) with no explicit filter → no assignedTo restriction.

  const direction = sort === 'oldest' ? 1 : -1;

  const [total, issues] = await Promise.all([
    Issue.countDocuments(filter),
    Issue.find(filter)
      .sort({ createdAt: direction, _id: direction })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(populateIssue)
      .lean(),
  ]);

  res.json({
    issues,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
});

export const createIssue = asyncHandler(async (req, res) => {
  const { projectId, assignedTo, ...data } = req.valid.body;

  if (!(await Project.exists({ _id: projectId }))) {
    throw new AppError('Project not found', 404);
  }

  // Validate assignee exists (if provided).
  if (assignedTo && !(await User.exists({ _id: assignedTo }))) {
    throw new AppError('Assigned user does not exist', 400);
  }

  const issue = await Issue.create({
    ...data,
    project: projectId,
    createdBy: req.user._id,
    assignedTo: assignedTo || null,
  });

  await logActivity({
    user: req.user,
    issue,
    type: 'created',
    action: `${req.user.name} created issue "${issue.title}"`,
  });

  await issue.populate(populateIssue);
  notify(req, 'issue:created', issue);
  res.status(201).json({ issue });
});

export const getIssue = asyncHandler(async (req, res) => {
  const issue = await findIssueOr404(req.valid.params.id);
  await issue.populate(populateIssue);
  res.json({ issue });
});

// Used by both PUT /:id and PATCH /:id/status.
export const updateIssue = asyncHandler(async (req, res) => {
  const issue = await findIssueOr404(req.valid.params.id);
  const updates = req.valid.body;

  const changed = Object.keys(updates).filter((key) => String(issue[key]) !== String(updates[key]));
  if (!changed.length) {
    await issue.populate(populateIssue);
    return res.json({ issue });
  }

  const statusOnly = changed.every((key) => key === 'status');
  if (!statusOnly) await assertCanEditIssue(req.user, issue);

  // If assignedTo is being changed, validate the target user exists.
  if (changed.includes('assignedTo') && updates.assignedTo) {
    if (!(await User.exists({ _id: updates.assignedTo }))) {
      throw new AppError('Assigned user does not exist', 400);
    }
  }

  const previousStatus = issue.status;
  issue.set(updates);
  await issue.save();

  if (changed.includes('status')) {
    await logActivity({
      user: req.user,
      issue,
      type: 'status_changed',
      action: `${req.user.name} changed status of "${issue.title}" from ${STATUS_LABELS[previousStatus]} to ${STATUS_LABELS[issue.status]}`,
    });
  }

  const otherFields = changed.filter((key) => key !== 'status');
  if (otherFields.length) {
    await logActivity({
      user: req.user,
      issue,
      type: 'updated',
      action: `${req.user.name} updated issue "${issue.title}" (${otherFields.join(', ')})`,
    });
  }

  await issue.populate(populateIssue);
  notify(req, 'issue:updated', issue);
  res.json({ issue });
});

export const deleteIssue = asyncHandler(async (req, res) => {
  const issue = await findIssueOr404(req.valid.params.id);
  await assertCanEditIssue(req.user, issue);

  await issue.deleteOne();
  await logActivity({
    user: req.user,
    issue,
    type: 'deleted',
    action: `${req.user.name} deleted issue "${issue.title}"`,
  });

  notify(req, 'issue:deleted', issue);
  res.json({ message: 'Issue deleted' });
});
