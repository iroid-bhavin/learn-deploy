import { Request, Response } from "express";
import { Availability, Resource } from "../models";
import { getResourceOrFail } from "../services/availability.service";
import { setErrorResponse } from "../utils/app-error";
import { CommonResponse } from "../utils/common-response";

export default class ResourceController {
  create = async (
    req: Request,
    res: Response
  ) => {
    const commonResponse = new CommonResponse();

    try {
      const {
        name,
        timezone,
      } = req.body;

      const resource =
        await Resource.create({
          name,
          timezone,
        });

      commonResponse.status = 201;
      commonResponse.success = true;
      commonResponse.message =
        "Resource created successfully";
      commonResponse.data = resource;
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
      const resources =
        await Resource.findAll({
          include: [Availability],
          order: [
            ["id", "ASC"],
            [Availability, "dayOfWeek", "ASC"],
            [Availability, "startTime", "ASC"],
          ],
        });

      commonResponse.status = 200;
      commonResponse.success = true;
      commonResponse.message =
        "Resources fetched successfully";
      commonResponse.data = resources;
    } catch (error: any) {
      setErrorResponse(commonResponse, error);
    }

    return res
      .status(commonResponse.status)
      .send(commonResponse);
  };

  getById = async (
    req: Request,
    res: Response
  ) => {
    const commonResponse = new CommonResponse();

    try {
      const resource = await getResourceOrFail(
        Number(req.params.id)
      );

      commonResponse.status = 200;
      commonResponse.success = true;
      commonResponse.message =
        "Resource fetched successfully";
      commonResponse.data = resource;
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
      const resource = await getResourceOrFail(
        Number(req.params.id)
      );

      await resource.update({
        name: req.body.name,
        timezone: req.body.timezone,
      });

      commonResponse.status = 200;
      commonResponse.success = true;
      commonResponse.message =
        "Resource updated successfully";
      commonResponse.data = resource;
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
      const resource = await getResourceOrFail(
        Number(req.params.id)
      );

      await resource.destroy();

      commonResponse.status = 200;
      commonResponse.success = true;
      commonResponse.message =
        "Resource deleted successfully";
      commonResponse.data = [];
    } catch (error: any) {
      setErrorResponse(commonResponse, error);
    }

    return res
      .status(commonResponse.status)
      .send(commonResponse);
  };
}
