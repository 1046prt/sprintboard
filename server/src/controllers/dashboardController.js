import Activity from '../models/Activity.js';
import Issue from '../models/Issue.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getVisibleUserIds } from '../utils/hierarchy.js';

const toCounts = (rows) => Object.fromEntries(rows.map((row) => [row._id, row.count]));

export const getStats = asyncHandler(async (req, res) => {
  const visibleIds = await getVisibleUserIds(req.user);

  // Build the issue match stage based on who this user can see.
  // Admins (visibleIds === null) see all issues.
  const issueMatch = visibleIds !== null
    ? {
        $or: [
          { assignedTo: { $in: visibleIds } },
          { createdBy: req.user._id },
        ],
      }
    : {};

  const [totalProjects, [grouped], recentActivity] = await Promise.all([
    Project.countDocuments(),
    Issue.aggregate([
      { $match: issueMatch },
      {
        $facet: {
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
        },
      },
    ]),
    Activity.find().sort({ createdAt: -1, _id: -1 }).limit(8).populate('user', 'name').lean(),
  ]);

  const byStatus = toCounts(grouped.byStatus);
  const byPriority = toCounts(grouped.byPriority);

  // For leads and project heads, include a team tasks breakdown.
  let teamTasks = null;
  if (req.user.role === 'lead' || req.user.role === 'project_head') {
    // Get the direct/sub-tree members (excluding self for the "team" view).
    const selfId = String(req.user._id);
    const memberIds = (visibleIds || []).filter((id) => id !== selfId);

    if (memberIds.length > 0) {
      const [members, memberIssues] = await Promise.all([
        User.find({ _id: { $in: memberIds } }).select('name role').lean(),
        Issue.find({ assignedTo: { $in: memberIds } })
          .sort({ createdAt: -1 })
          .limit(50)
          .populate([
            { path: 'assignedTo', select: 'name role' },
            { path: 'project', select: 'name' },
          ])
          .lean(),
      ]);

      teamTasks = {
        members,
        issues: memberIssues,
        total: memberIssues.length,
        inProgress: memberIssues.filter((i) => i.status === 'in-progress').length,
        completed: memberIssues.filter((i) => i.status === 'done').length,
        overdue: memberIssues.filter((i) => i.status === 'todo' && i.priority === 'high').length,
      };
    }
  }

  const stats = {
    totalProjects,
    totalIssues: (byStatus.todo || 0) + (byStatus['in-progress'] || 0) + (byStatus.done || 0),
    openIssues: byStatus.todo || 0,
    inProgressIssues: byStatus['in-progress'] || 0,
    completedIssues: byStatus.done || 0,
    highPriorityIssues: byPriority.high || 0,
    byPriority: {
      low: byPriority.low || 0,
      medium: byPriority.medium || 0,
      high: byPriority.high || 0,
    },
    recentActivity,
    teamTasks,
    userRole: req.user.role,
  };

  res.json({ stats });
});
