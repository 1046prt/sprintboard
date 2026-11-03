import User from '../models/User.js';

/**
 * Walks the org tree downward from `rootUserId` and returns the set of user
 * ObjectId strings that are visible to the root user (including themselves).
 *
 * Rules:
 *   admin        → returns null (means "no filter — see everyone")
 *   project_head → root + all users whose managerId chain leads back to root
 *   lead         → root + their direct reports
 *   member       → only themselves
 *
 * Returning null is the signal for callers to skip the assignedTo filter
 * entirely (admin sees all issues regardless of assignment).
 *
 * @param {Object} user  - The authenticated Mongoose user document
 * @returns {Promise<null | string[]>}
 */
export async function getVisibleUserIds(user) {
  if (user.role === 'admin') return null;

  const selfId = String(user._id);

  if (user.role === 'member') return [selfId];

  if (user.role === 'lead') {
    // Direct reports only.
    const reports = await User.find({ managerId: user._id }).select('_id').lean();
    return [selfId, ...reports.map((u) => String(u._id))];
  }

  // project_head — recursively collect the whole sub-tree.
  if (user.role === 'project_head') {
    const ids = new Set([selfId]);
    const queue = [user._id];

    while (queue.length) {
      const parentId = queue.shift();
      // eslint-disable-next-line no-await-in-loop
      const children = await User.find({ managerId: parentId }).select('_id').lean();
      for (const child of children) {
        const childId = String(child._id);
        if (!ids.has(childId)) {
          ids.add(childId);
          queue.push(child._id);
        }
      }
    }

    return [...ids];
  }

  // Fallback: unknown role — show nothing extra.
  return [selfId];
}
