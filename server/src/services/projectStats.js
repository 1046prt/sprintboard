import Issue from '../models/Issue.js';

const empty = () => ({ total: 0, todo: 0, inProgress: 0, done: 0 });

// One aggregation for any number of projects, so the project list does not
// fire a query per card.
export async function statsByProject(projectIds) {
  const stats = new Map(projectIds.map((id) => [String(id), empty()]));
  if (!projectIds.length) return stats;

  const rows = await Issue.aggregate([
    { $match: { project: { $in: projectIds } } },
    { $group: { _id: { project: '$project', status: '$status' }, count: { $sum: 1 } } },
  ]);

  for (const row of rows) {
    const entry = stats.get(String(row._id.project));
    const key = row._id.status === 'in-progress' ? 'inProgress' : row._id.status;
    entry[key] = row.count;
    entry.total += row.count;
  }
  return stats;
}
