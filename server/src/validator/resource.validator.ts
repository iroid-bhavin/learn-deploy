import Joi from "joi";
import { IANAZone } from "luxon";

export const ianaTimezone = Joi.string().custom(
  (value, helpers) =>
    IANAZone.isValidZone(value)
      ? value
      : helpers.message({
          custom: "{{#label}} must be a valid IANA timezone",
        })
);

export const resourceValidation =
  Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .required(),

    timezone: ianaTimezone.required(),
  });
