// auth.routes.js
import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/auth.validator.js';

const router = express.Router();

router.get('/verify-email', authController.verifyEmail);
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.patch('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

// Telegram linking
router.post('/telegram/link', authController.linkTelegram);
router.post('/telegram/unlink', authenticate, authController.unlinkTelegram);

export default router;
