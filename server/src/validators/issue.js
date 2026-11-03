import { z } from 'zod';
import { STATUSES, PRIORITIES } from '../constants.js';
import { objectId, atLeastOneField, atLeastOneFieldMessage } from './common.js';

const title = z
  .string({ required_error: 'Title is required' })
  .trim()
  .min(1, 'Title is required')
  .max(150, 'Title must be 150 characters or fewer');

const description = z.string().trim().max(2000, 'Description must be 2000 characters or fewer');
const status = z.enum(STATUSES, { errorMap: () => ({ message: `Status must be one of: ${STATUSES.join(', ')}` }) });
const priority = z.enum(PRIORITIES, {
  errorMap: () => ({ message: `Priority must be one of: ${PRIORITIES.join(', ')}` }),
});
// null explicitly unassigns; undefined means "do not change".
const assignedTo = objectId.nullable().optional();

export const createIssueSchema = z.object({
  title,
  description: description.optional().default(''),
  status: status.optional(),
  priority: priority.optional(),
  projectId: objectId,
  assignedTo,
});

export const updateIssueSchema = z
  .object({
    title: title.optional(),
    description: description.optional(),
    status: status.optional(),
    priority: priority.optional(),
    assignedTo,
  })
  .refine(atLeastOneField, atLeastOneFieldMessage);

export const statusSchema = z.object({ status });

export const listIssuesQuery = z.object({
  status: status.optional(),
  priority: priority.optional(),
  project: objectId.optional(),
  assignedTo: objectId.optional(),
  // When "mine=true" the backend will scope to the caller's visible hierarchy.
  mine: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  // An empty string is allowed and simply means "no search". Arrays
  // (?search=a&search=b) and over-long terms are rejected.
  search: z.string().trim().max(100, 'Search term must be 100 characters or fewer').optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
