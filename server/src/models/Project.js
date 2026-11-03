import { createModel } from './base.js';
import User from './User.js';

export default createModel('Project', 'projects', {
  createdBy: { model: User },
});
