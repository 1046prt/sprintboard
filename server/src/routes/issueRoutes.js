import { Router } from 'express';
import {
  createIssue,
  deleteIssue,
  getIssue,
  listIssues,
  updateIssue,
} from '../controllers/issueController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import {
  createIssueSchema,
  listIssuesQuery,
  statusSchema,
  updateIssueSchema,
} from '../validators/issue.js';

const router = Router();
router.use(protect);

router
  .route('/')
  .get(validate(listIssuesQuery, 'query'), listIssues)
  .post(validate(createIssueSchema), createIssue);

router
  .route('/:id')
  .all(validate(idParams, 'params'))
  .get(getIssue)
  .put(validate(updateIssueSchema), updateIssue)
  .delete(deleteIssue);

router.patch('/:id/status', validate(idParams, 'params'), validate(statusSchema), updateIssue);

export default router;
