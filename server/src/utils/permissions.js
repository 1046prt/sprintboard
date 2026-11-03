import AppError from './AppError.js';

export const isAdmin = (user) => user.role === 'admin';

const HIERARCHY_ROLES = new Set(['admin', 'project_head', 'lead', 'member']);
const ROLE_RANK = { admin: 4, project_head: 3, lead: 2, member: 1 };

export const roleRank = (role) => ROLE_RANK[role] ?? 0;

const sameId = (a, b) => String(a) === String(b);

// Admins can manage anything, everybody else only what they created.
export const canManage = (user, ownerId) => isAdmin(user) || sameId(ownerId, user._id);

export function assertCanManage(user, ownerId, what = 'this resource') {
  if (!canManage(user, ownerId)) {
    throw new AppError(`You do not have permission to modify ${what}`, 403);
  }
}

// A manager can only set roles that are strictly below their own rank.
export function canAssignRole(manager, targetRole) {
  if (isAdmin(manager)) return HIERARCHY_ROLES.has(targetRole);
  return roleRank(targetRole) < roleRank(manager.role);
}
