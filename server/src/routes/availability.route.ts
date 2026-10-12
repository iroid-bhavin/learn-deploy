import express from "express";

import AvailabilityController from "../controllers/availability.controller";

import {
  validateMiddleware,
} from "../middlewares/validation.middleware";

import {
  availabilityValidation,
  availabilityQueryValidation,
} from "../validator/availability.validator";

import {
  requireAdmin,
  requireSignIn,
} from "../middlewares/auth.middleware";

const router = express.Router();

const controller =
  new AvailabilityController();

router.post(
  "/:resourceId/availability",
  requireSignIn,
  requireAdmin,
  validateMiddleware(
    availabilityValidation
  ),
  controller.create
);

router.get(
  "/:resourceId/availability",
  requireSignIn,
  validateMiddleware(
    availabilityQueryValidation,
    "query"
  ),
  controller.list
);

router.put(
  "/:resourceId/availability/:id",
  requireSignIn,
  requireAdmin,
  validateMiddleware(
    availabilityValidation
  ),
  controller.update
);

router.delete(
  "/:resourceId/availability/:id",
  requireSignIn,
  requireAdmin,
  controller.delete
);

export default router;