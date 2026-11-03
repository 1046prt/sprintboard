import api from './client.js';

export const authApi = {
  register: (data) => api.post('/auth/register', data).then((r) => r.data),
  login: (data) => api.post('/auth/login', data).then((r) => r.data),
  profile: () => api.get('/auth/profile').then((r) => r.data.user),
};

export const projectApi = {
  list: () => api.get('/projects').then((r) => r.data.projects),
  get: (id) => api.get(`/projects/${id}`).then((r) => r.data.project),
  create: (data) => api.post('/projects', data).then((r) => r.data.project),
  update: (id, data) => api.put(`/projects/${id}`, data).then((r) => r.data.project),
  remove: (id) => api.delete(`/projects/${id}`),
  activity: (id, limit = 15) => api.get(`/projects/${id}/activity`, { params: { limit } }).then((r) => r.data.activities),
};

export const issueApi = {
  list: (params, signal) => api.get('/issues', { params, signal }).then((r) => r.data),
  create: (data) => api.post('/issues', data).then((r) => r.data.issue),
  update: (id, data) => api.put(`/issues/${id}`, data).then((r) => r.data.issue),
  setStatus: (id, status) => api.patch(`/issues/${id}/status`, { status }).then((r) => r.data.issue),
  remove: (id) => api.delete(`/issues/${id}`),
};

export const dashboardApi = {
  stats: () => api.get('/dashboard/stats').then((r) => r.data.stats),
};

export const teamApi = {
  list: () => api.get('/team').then((r) => r.data.users),
  listAll: () => api.get('/team/all').then((r) => r.data.users),
  updateRole: (id, role) => api.patch(`/team/${id}/role`, { role }).then((r) => r.data.user),
  updateManager: (id, managerId) => api.patch(`/team/${id}/manager`, { managerId }).then((r) => r.data.user),
};