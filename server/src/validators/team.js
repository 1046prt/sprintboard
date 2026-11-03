import { z } from 'zod';
import { ROLES } from '../constants.js';
import { objectId } from './common.js';

export const updateRoleSchema = z.object({
  role: z.enum(ROLES, { errorMap: () => ({ message: `Role must be one of: ${ROLES.join(', ')}` }) }),
});

export const updateManagerSchema = z.object({
  // null means "remove manager" (no manager = top of tree)
  managerId: objectId.nullable(),
});
