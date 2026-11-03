import Activity from '../models/Activity.js';

export function logActivity({ user, issue, type, action }) {
  return Activity.create({
    user: user._id,
    issue: issue._id,
    project: issue.project,
    type,
    action,
  });
}
