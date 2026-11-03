import { z } from 'zod';
import { atLeastOneField, atLeastOneFieldMessage } from './common.js';

const name = z
  .string({ required_error: 'Project name is required' })
  .trim()
  .min(2, 'Project name must be at least 2 characters')
  .max(100, 'Project name must be 100 characters or fewer');

const description = z.string().trim().max(1000, 'Description must be 1000 characters or fewer');

export const createProjectSchema = z.object({
  name,
  description: description.optional().default(''),
});

export const updateProjectSchema = z
  .object({ name: name.optional(), description: description.optional() })
  .refine(atLeastOneField, atLeastOneFieldMessage);

export const listProjectsQuery = z.object({
  mine: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export const activityQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
