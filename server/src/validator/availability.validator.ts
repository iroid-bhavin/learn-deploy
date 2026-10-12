import Joi from "joi";

const localTime = Joi.string()
  .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/);

export const availabilityValidation =
  Joi.object({
    dayOfWeek: Joi.number()
      .integer()
      .min(0)
      .max(6)
      .required(),

    startTime: localTime.required(),

    endTime: localTime
      .required()
      .custom((value, helpers) => {
        const { startTime } = helpers.state.ancestors[0];

        return value > startTime
          ? value
          : helpers.message({
            custom: "{{#label}} must be after startTime",
          });
      }),
  });

export const availabilityQueryValidation =
  Joi.object({
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  });
