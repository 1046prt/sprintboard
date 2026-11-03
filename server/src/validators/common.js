import { z } from 'zod';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid id');

export const idParams = z.object({ id: objectId });

export const atLeastOneField = (obj) => Object.keys(obj).length > 0;
export const atLeastOneFieldMessage = { message: 'Provide at least one field to update' };
