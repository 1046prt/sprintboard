import { createModel } from './base.js';
import Project from './Project.js';
import User from './User.js';

export default createModel('Issue', 'issues', {
  project: { model: Project },
  createdBy: { model: User },
  assignedTo: { model: User },
});
