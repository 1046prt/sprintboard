export const STATUSES = ['todo', 'in-progress', 'done'];
export const PRIORITIES = ['low', 'medium', 'high'];

// Org hierarchy from broadest to narrowest visibility.
// admin        → sees everything across the entire org
// project_head → sees their own tasks + all tasks of their reporting sub-tree
// lead         → sees their own tasks + direct team-members' tasks
// member       → sees only their own tasks
export const ROLES = ['admin', 'project_head', 'lead', 'member'];
export const ACTIVITY_TYPES = ['created', 'updated', 'status_changed', 'deleted'];

export const STATUS_LABELS = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  done: 'Done',
};

export const ROLE_LABELS = {
  admin: 'Admin',
  project_head: 'Project Head',
  lead: 'Team Lead',
  member: 'Member',
};
