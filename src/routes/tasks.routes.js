// tasks.routes.js
import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import * as taskController from '../controllers/task.controller.js';
import { createTaskSchema, updateTaskSchema, taskIdSchema } from '../validators/task.validator.js';

const router = express.Router();
router.use(authenticate);

router.get('/', taskController.getTasks);
router.post('/', validate(createTaskSchema), taskController.createTask);
router.patch('/:id', validate(taskIdSchema, 'params'), validate(updateTaskSchema), taskController.updateTask);
router.patch('/:id/move', validate(taskIdSchema, 'params'), taskController.moveTask);
router.post('/:id/complete', validate(taskIdSchema, 'params'), taskController.completeTask);
router.delete('/:id', validate(taskIdSchema, 'params'), taskController.deleteTask);

export default router;
