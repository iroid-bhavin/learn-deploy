import Joi from "joi";

export const registerValidation = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(100)
    .required(),

  lastName: Joi.string()
    .min(2)
    .max(100)
    .required(),

  email: Joi.string()
    .email()
    .required(),

  password: Joi.string()
    .min(8)
    .required(),
});

export const loginValidation = Joi.object({
  email: Joi.string()
    .email()
    .required(),

  password: Joi.string()
    .required(),
});