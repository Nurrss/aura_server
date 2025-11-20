// user.routes.js
import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as controller from '../controllers/user.controller.js';

const router = express.Router();
router.use(authenticate);

router.get('/me', controller.getMe);
router.patch('/me', controller.updateMe);

export default router;
