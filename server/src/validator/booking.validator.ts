import Joi from "joi";
import { DateTime } from "luxon";

export const OFFSET_SUFFIX = /(Z|[+-]\d{2}:\d{2})$/;

const instant = Joi.string().custom((value, helpers) =>
  OFFSET_SUFFIX.test(value) &&
    DateTime.fromISO(value, { setZone: true }).isValid
    ? value
    : helpers.message({
      custom:
        "{{#label}} must be an ISO 8601 instant with a timezone offset (e.g. 2026-01-12T09:00:00Z)",
    })
);

export const bookingValidation =
  Joi.object({
    resourceId: Joi.number()
      .integer()
      .positive()
      .required(),

    startTime: instant.required(),

    endTime: instant.required(),
  });
