export const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'project_head', label: 'Project Head' },
  { value: 'lead', label: 'Team Lead' },
  { value: 'member', label: 'Member' },
];

export const ROLE_LABELS = {
  admin: 'Admin',
  project_head: 'Project Head',
  lead: 'Team Lead',
  member: 'Member',
};

export const labelFor = (options, value) => options.find((o) => o.value === value)?.label || value;
