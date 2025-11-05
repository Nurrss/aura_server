// habits.routes.js
import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as habitController from '../controllers/habit.controller.js';

const router = express.Router();
router.use(authenticate);

router.get('/', habitController.getHabits);
router.post('/', habitController.createHabit);
router.post('/:id/toggle', habitController.toggleHabit);
router.patch('/:id', habitController.updateHabit);

export default router;
