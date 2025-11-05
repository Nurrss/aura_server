// tasks.routes.js
import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as taskController from '../controllers/task.controller.js';

const router = express.Router();
router.use(authenticate);

router.get('/', taskController.getTasks);
router.post('/', taskController.createTask);
router.patch('/:id', taskController.updateTask);
router.patch('/:id/move', taskController.moveTask);
router.post('/:id/complete', taskController.completeTask);

export default router;
