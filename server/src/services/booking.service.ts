import { DateTime } from "luxon";

import { SLOT_MINUTES } from "../config/booking";
import { sequelize } from "../config/db";
import Booking from "../models/booking.model";
import Resource from "../models/resource.model";
import { AppError } from "../utils/app-error";
import { OFFSET_SUFFIX } from "../validator/booking.validator";
import {
  getResourceOrFail,
  isBookableSlot,
  toUtcIso,
} from "./availability.service";

export interface BookingInput {
  resourceId: number;
  startTime: string;
  endTime: string;
}

const parseInstant = (value: string, field: string) => {
  const instant = DateTime.fromISO(value, { setZone: true });

  if (!instant.isValid || !OFFSET_SUFFIX.test(value)) {
    throw new AppError(400, `Invalid ${field}.`);
  }

  return instant.toUTC();
};

export const validateBookingInput = async (input: BookingInput) => {
  const resource = await getResourceOrFail(input.resourceId);

  const start = parseInstant(input.startTime, "startTime");
  const end = parseInstant(input.endTime, "endTime");

  // A slot that has already started (or ended) can no longer be booked.
  if (start <= DateTime.utc()) {
    throw new AppError(
      400,
      "This slot is in the past and can no longer be booked."
    );
  }

  if (end.diff(start, "minutes").minutes !== SLOT_MINUTES) {
    throw new AppError(
      400,
      `A booking must be exactly ${SLOT_MINUTES} minutes long.`
    );
  }

  if (!(await isBookableSlot(resource, start, end))) {
    throw new AppError(
      400,
      "Requested time is not a bookable slot within the resource's working hours."
    );
  }

  return { resource, start, end };
};

export const serializeBooking = (
  booking: Booking,
  resource?: Resource | null
) => ({
  id: booking.id,
  userId: booking.userId,
  resourceId: booking.resourceId,
  startTime: toUtcIso(booking.startTime),
  endTime: toUtcIso(booking.endTime),
  createdAt: booking.createdAt && toUtcIso(booking.createdAt),
  resource: resource
    ? {
      id: resource.id,
      name: resource.name,
      timezone: resource.timezone,
    }
    : undefined,
});

export const createBooking = async (
  userId: number,
  input: BookingInput
) => {
  const { resource, start, end } = await validateBookingInput(input);

  const booking = await sequelize.transaction(async (transaction) => {
    await Resource.findByPk(resource.id, {
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    // double booking: an overlapping insert fails here with SQLSTATE 23P01,
    // which setErrorResponse maps to 409.
    return Booking.create(
      {
        userId,
        resourceId: resource.id,
        startTime: start.toJSDate(),
        endTime: end.toJSDate(),
      },
      { transaction }
    );
  });

  return serializeBooking(booking, resource);
};

export const getOwnBookingOrFail = async (
  bookingId: number,
  userId: number
) => {
  const booking = Number.isInteger(bookingId)
    ? await Booking.findByPk(bookingId)
    : null;

  if (!booking) {
    throw new AppError(404, "Booking not found.");
  }

  if (booking.userId !== userId) {
    throw new AppError(
      403,
      "You are not allowed to access this booking."
    );
  }

  return booking;
};

export const updateBooking = async (
  bookingId: number,
  userId: number,
  input: BookingInput
) => {
  const booking = await getOwnBookingOrFail(bookingId, userId);

  const { resource, start, end } =
    await validateBookingInput(input);

  await booking.update({
    resourceId: resource.id,
    startTime: start.toJSDate(),
    endTime: end.toJSDate(),
  });

  return serializeBooking(booking, resource);
};
