import { Response } from "express";

import { Booking, Resource } from "../models";

import {
  AuthRequest,
} from "../middlewares/auth.middleware";

import {
  createBooking,
  getOwnBookingOrFail,
  serializeBooking,
  updateBooking,
} from "../services/booking.service";

import { AppError, setErrorResponse } from "../utils/app-error";
import { CommonResponse } from "../utils/common-response";

const getUserId = (req: AuthRequest) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required.");
  }

  return req.user.id;
};

export default class BookingController {
  create = async (
    req: AuthRequest,
    res: Response
  ) => {
    const commonResponse = new CommonResponse();

    try {
      const booking = await createBooking(
        getUserId(req),
        req.body
      );

      commonResponse.status = 201;
      commonResponse.success = true;
      commonResponse.message =
        "Booking created successfully";
      commonResponse.data = booking;
    } catch (error: any) {
      setErrorResponse(commonResponse, error);
    }

    return res
      .status(commonResponse.status)
      .send(commonResponse);
  };

  list = async (
    req: AuthRequest,
    res: Response
  ) => {
    const commonResponse = new CommonResponse();

    try {
      const bookings =
        await Booking.findAll({
          where: {
            userId: getUserId(req),
          },
          include: [Resource],
          order: [
            ["startTime", "ASC"],
          ],
        });

      commonResponse.status = 200;
      commonResponse.success = true;
      commonResponse.message =
        "Bookings fetched successfully";
      commonResponse.data = bookings.map(
        (booking: any) =>
          serializeBooking(booking, booking.Resource)
      );
    } catch (error: any) {
      setErrorResponse(commonResponse, error);
    }

    return res
      .status(commonResponse.status)
      .send(commonResponse);
  };

  getById = async (
    req: AuthRequest,
    res: Response
  ) => {
    const commonResponse = new CommonResponse();

    try {
      const booking = await getOwnBookingOrFail(
        Number(req.params.id),
        getUserId(req)
      );

      const resource = await Resource.findByPk(
        booking.resourceId
      );

      commonResponse.status = 200;
      commonResponse.success = true;
      commonResponse.message =
        "Booking fetched successfully";
      commonResponse.data =
        serializeBooking(booking, resource);
    } catch (error: any) {
      setErrorResponse(commonResponse, error);
    }

    return res
      .status(commonResponse.status)
      .send(commonResponse);
  };

  update = async (
    req: AuthRequest,
    res: Response
  ) => {
    const commonResponse = new CommonResponse();

    try {
      const booking = await updateBooking(
        Number(req.params.id),
        getUserId(req),
        req.body
      );

      commonResponse.status = 200;
      commonResponse.success = true;
      commonResponse.message =
        "Booking updated successfully";
      commonResponse.data = booking;
    } catch (error: any) {
      setErrorResponse(commonResponse, error);
    }

    return res
      .status(commonResponse.status)
      .send(commonResponse);
  };

  delete = async (
    req: AuthRequest,
    res: Response
  ) => {
    const commonResponse = new CommonResponse();

    try {
      const booking = await getOwnBookingOrFail(
        Number(req.params.id),
        getUserId(req)
      );

      await booking.destroy();

      commonResponse.status = 200;
      commonResponse.success = true;
      commonResponse.message =
        "Booking deleted successfully";
      commonResponse.data = [];
    } catch (error: any) {
      setErrorResponse(commonResponse, error);
    }

    return res
      .status(commonResponse.status)
      .send(commonResponse);
  };
}
