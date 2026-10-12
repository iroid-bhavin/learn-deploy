import { Request, Response } from "express";
import Availability from "../models/availability.model";
import {
  getAvailability,
  getResourceOrFail,
} from "../services/availability.service";
import { AppError, setErrorResponse } from "../utils/app-error";
import { CommonResponse } from "../utils/common-response";

const findRuleOrFail = async (req: Request) => {
  const availability = await Availability.findOne({
    where: {
      id: Number(req.params.id) || 0,
      resourceId: Number(req.params.resourceId) || 0,
    },
  });

  if (!availability) {
    throw new AppError(404, "Availability not found.");
  }

  return availability;
};

export default class AvailabilityController {
  create = async (
    req: Request,
    res: Response
  ) => {
    const commonResponse = new CommonResponse();

    try {
      const resource = await getResourceOrFail(
        Number(req.params.resourceId)
      );

      const availability =
        await Availability.create({
          resourceId: resource.id,
          dayOfWeek: req.body.dayOfWeek,
          startTime: req.body.startTime,
          endTime: req.body.endTime,
        });

      commonResponse.status = 201;
      commonResponse.success = true;
      commonResponse.message =
        "Availability created successfully";
      commonResponse.data =
        availability;
    } catch (error: any) {
      setErrorResponse(commonResponse, error);
    }

    return res
      .status(commonResponse.status)
      .send(commonResponse);
  };

  list = async (
    req: Request,
    res: Response
  ) => {
    const commonResponse = new CommonResponse();

    try {
      const resourceId = Number(req.params.resourceId);
      const { date } = req.query as { date?: string };

      if (date) {
        commonResponse.data = await getAvailability(resourceId, date);
      } else {
        await getResourceOrFail(resourceId);

        commonResponse.data =
          await Availability.findAll({
            where: { resourceId },
            order: [
              ["dayOfWeek", "ASC"],
              ["startTime", "ASC"],
            ],
          });
      }

      commonResponse.status = 200;
      commonResponse.success = true;
      commonResponse.message =
        "Availability fetched successfully";
    } catch (error: any) {
      setErrorResponse(commonResponse, error);
    }

    return res
      .status(commonResponse.status)
      .send(commonResponse);
  };

  update = async (
    req: Request,
    res: Response
  ) => {
    const commonResponse = new CommonResponse();

    try {
      const availability = await findRuleOrFail(req);

      await availability.update({
        dayOfWeek: req.body.dayOfWeek,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
      });

      commonResponse.status = 200;
      commonResponse.success = true;
      commonResponse.message =
        "Availability updated successfully";
      commonResponse.data =
        availability;
    } catch (error: any) {
      setErrorResponse(commonResponse, error);
    }

    return res
      .status(commonResponse.status)
      .send(commonResponse);
  };

  delete = async (
    req: Request,
    res: Response
  ) => {
    const commonResponse = new CommonResponse();

    try {
      const availability = await findRuleOrFail(req);

      await availability.destroy();

      commonResponse.status = 200;
      commonResponse.success = true;
      commonResponse.message =
        "Availability deleted successfully";
      commonResponse.data = [];
    } catch (error: any) {
      setErrorResponse(commonResponse, error);
    }

    return res
      .status(commonResponse.status)
      .send(commonResponse);
  };
}
