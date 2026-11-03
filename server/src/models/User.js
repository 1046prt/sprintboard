import bcrypt from 'bcryptjs';
import { createModel } from './base.js';

const User = createModel('User', 'users');
User.prototype.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

const originalCreate = User.create;
User.create = async function create(data) {
  return originalCreate.call(this, { ...data, password: await bcrypt.hash(data.password, 10) });
};

export default User;
