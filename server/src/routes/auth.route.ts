import express from "express";

import AuthController from "../controllers/auth.controller";

import {
  registerValidation,
  loginValidation,
} from "../validator/auth.validator";

import {
  requireSignIn,
} from "../middlewares/auth.middleware";

import {
  validateMiddleware,
} from "../middlewares/validation.middleware";

const router = express.Router();

const authController = new AuthController();

router.post(
  "/signup",
  validateMiddleware(registerValidation),
  authController.signup
);

router.post(
  "/login",
  validateMiddleware(loginValidation),
  authController.login
);

router.get(
  "/me",
  requireSignIn,
  authController.me
);

export default router;