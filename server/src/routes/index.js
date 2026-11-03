import { Router } from 'express';
import { getStats } from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';
import authRoutes from './authRoutes.js';
import issueRoutes from './issueRoutes.js';
import projectRoutes from './projectRoutes.js';
import teamRoutes from './teamRoutes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok' }));
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/issues', issueRoutes);
router.use('/team', teamRoutes);
router.get('/dashboard/stats', protect, getStats);

export default router;
