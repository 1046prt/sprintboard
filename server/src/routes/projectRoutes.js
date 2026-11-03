import { Router } from 'express';
import {
  createProject,
  deleteProject,
  getProject,
  getProjectActivity,
  listProjects,
  updateProject,
} from '../controllers/projectController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import {
  activityQuery,
  createProjectSchema,
  listProjectsQuery,
  updateProjectSchema,
} from '../validators/project.js';

const router = Router();
router.use(protect);

router
  .route('/')
  .get(validate(listProjectsQuery, 'query'), listProjects)
  .post(validate(createProjectSchema), createProject);

router
  .route('/:id')
  .all(validate(idParams, 'params'))
  .get(getProject)
  .put(validate(updateProjectSchema), updateProject)
  .delete(deleteProject);

router.get('/:id/activity', validate(idParams, 'params'), validate(activityQuery, 'query'), getProjectActivity);

export default router;
