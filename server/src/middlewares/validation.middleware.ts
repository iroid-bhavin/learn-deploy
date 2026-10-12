import { Request, Response, NextFunction } from "express";
import Joi from "joi";

export const validateMiddleware = (
  schema: Joi.ObjectSchema,
  source: "body" | "query" = "body"
) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { error } = schema.validate(req[source] ?? {}, {
      abortEarly: false,
    });

    if (error) {
      return res.status(400).send({
        success: false,
        status: 400,
        message: "Validation error",
        data: error.details.map(
          (detail) => detail.message
        ),
      });
    }

    next();
  };
};
