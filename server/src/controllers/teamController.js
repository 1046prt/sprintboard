import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getVisibleUserIds } from '../utils/hierarchy.js';
import { canAssignRole, isAdmin } from '../utils/permissions.js';

const safeUser = { path: 'managerId', select: 'name role' };

/**
 * GET /api/team
 * Returns the list of users visible to the caller based on their role.
 * - admin: all users
 * - project_head / lead: their sub-tree
 * - member: only themselves
 */
export const listTeam = asyncHandler(async (req, res) => {
  const visibleIds = await getVisibleUserIds(req.user);

  const filter = visibleIds !== null ? { _id: { $in: visibleIds } } : {};
  const users = await User.find(filter)
    .sort({ name: 1 })
    .populate(safeUser)
    .lean();

  res.json({ users });
});

/**
 * GET /api/team/all
 * Returns ALL users (name + role only). Used to populate "assign to" and
 * "reports to" dropdowns. Available to any authenticated user.
 */
export const listAllUsers = asyncHandler(async (_req, res) => {
  const users = await User.find({}).select('name role managerId').sort({ name: 1 }).populate(safeUser).lean();
  res.json({ users });
});

/**
 * PATCH /api/team/:id/role
 * Admin only: update a user's role.
 */
export const updateRole = asyncHandler(async (req, res) => {
  if (!isAdmin(req.user)) throw new AppError('Only admins can change roles', 403);

  const { id } = req.valid.params;
  const { role } = req.valid.body;

  if (!canAssignRole(req.user, role)) {
    throw new AppError('You cannot assign this role', 403);
  }

  const user = await User.findById(id);
  if (!user) throw new AppError('User not found', 404);
  if (String(user._id) === String(req.user._id)) {
    throw new AppError('You cannot change your own role', 400);
  }

  user.role = role;
  await user.save();
  await user.populate(safeUser);

  res.json({ user });
});

/**
 * PATCH /api/team/:id/manager
 * Admin only: set or clear a user's manager (reporting relationship).
 */
export const updateManager = asyncHandler(async (req, res) => {
  if (!isAdmin(req.user)) throw new AppError('Only admins can change reporting relationships', 403);

  const { id } = req.valid.params;
  const { managerId } = req.valid.body;

  if (managerId && String(managerId) === String(id)) {
    throw new AppError('A user cannot report to themselves', 400);
  }

  if (managerId && !(await User.exists({ _id: managerId }))) {
    throw new AppError('Manager does not exist', 404);
  }

  // Guard against creating a cycle: the proposed manager must NOT be a
  // descendant of the user being updated.
  if (managerId) {
    let cursor = managerId;
    const visited = new Set([String(id)]);
    while (cursor) {
      if (visited.has(String(cursor))) {
        throw new AppError('This change would create a circular reporting relationship', 400);
      }
      visited.add(String(cursor));
      // eslint-disable-next-line no-await-in-loop
      const parent = await User.findById(cursor).select('managerId').lean();
      cursor = parent?.managerId || null;
    }
  }

  const user = await User.findById(id);
  if (!user) throw new AppError('User not found', 404);

  user.managerId = managerId || null;
  await user.save();
  await user.populate(safeUser);

  res.json({ user });
});
