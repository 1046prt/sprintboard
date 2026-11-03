import { env } from '../config/env.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { signToken } from '../utils/token.js';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, managerId } = req.valid.body;

  if (await User.exists({ email })) {
    throw new AppError('An account with this email already exists', 409);
  }

  const role = env.adminEmails.includes(email) ? 'admin' : 'member';

  if (managerId && !(await User.exists({ _id: managerId }))) {
    throw new AppError('Referenced manager does not exist', 400);
  }

  const user = await User.create({ name, email, password, role, managerId: managerId || null });

  res.status(201).json({ user, token: signToken(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.valid.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  res.json({ user, token: signToken(user) });
});

export const getProfile = (req, res) => {
  res.json({ user: req.user });
};
