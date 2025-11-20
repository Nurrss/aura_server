// habits.routes.js
import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import * as habitController from '../controllers/habit.controller.js';
import { createHabitSchema, updateHabitSchema, habitIdSchema } from '../validators/habit.validator.js';

const router = express.Router();
router.use(authenticate);

router.get('/', habitController.getHabits);
router.post('/', validate(createHabitSchema), habitController.createHabit);
router.post('/:id/toggle', validate(habitIdSchema, 'params'), habitController.toggleHabit);
router.patch('/:id', validate(habitIdSchema, 'params'), validate(updateHabitSchema), habitController.updateHabit);
router.delete('/:id', validate(habitIdSchema, 'params'), habitController.deleteHabit);

export default router;
