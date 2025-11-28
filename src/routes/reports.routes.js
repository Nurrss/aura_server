// reports.routes.js
import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as controller from '../controllers/report.controller.js';

const router = express.Router();
router.use(authenticate);

// Get reports for date range
router.get('/', controller.getReports);
router.get('/today', controller.getToday);
router.post('/daily', controller.saveDaily);

//
router.post('/daily/run', controller.runDailyJob);

export default router;
