// pomodoro.routes.js
import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as controller from '../controllers/pomodoro.controller.js';

const router = express.Router();
router.use(authenticate);

router.post('/start', controller.start);
router.post('/finish', controller.finish);
router.get('/stats', controller.stats);
router.delete('/:id', controller.deleteSession);

export default router;
