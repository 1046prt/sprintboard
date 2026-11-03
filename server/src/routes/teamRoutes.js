import { Router } from 'express';
import { listTeam, listAllUsers, updateRole, updateManager } from '../controllers/teamController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import { updateManagerSchema, updateRoleSchema } from '../validators/team.js';

const router = Router();
router.use(protect);

router.get('/', listTeam);
router.get('/all', listAllUsers);

router.patch('/:id/role', validate(idParams, 'params'), validate(updateRoleSchema), updateRole);
router.patch('/:id/manager', validate(idParams, 'params'), validate(updateManagerSchema), updateManager);

export default router;
