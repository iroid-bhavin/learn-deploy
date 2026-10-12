import express from "express";

import BookingController from "../controllers/booking.controller";

import { requireSignIn } from "../middlewares/auth.middleware";

import {
  validateMiddleware,
} from "../middlewares/validation.middleware";

import {
  bookingValidation,
} from "../validator/booking.validator";

const router = express.Router();

const bookingController =
  new BookingController();

router.post(
  "/",
  requireSignIn,
  validateMiddleware(bookingValidation),
  bookingController.create
);

router.get(
  "/",
  requireSignIn,
  bookingController.list
);

router.get(
  "/:id",
  requireSignIn,
  bookingController.getById
);

router.put(
  "/:id",
  requireSignIn,
  validateMiddleware(bookingValidation),
  bookingController.update
);

router.delete(
  "/:id",
  requireSignIn,
  bookingController.delete
);

export default router;