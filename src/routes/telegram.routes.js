// telegram.routes.js
import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as controller from '../controllers/telegram.controller.js';

const router = express.Router();
router.use(authenticate);

router.post('/notify', controller.notify);
router.post('/link', controller.link);
router.post('/report', controller.sendReport);

export default router;
