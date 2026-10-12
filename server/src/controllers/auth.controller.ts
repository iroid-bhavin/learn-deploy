import { Request, Response } from "express";
import { UserRole } from "../models/common.model";
import User from "../models/user.model";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  comparePassword,
  generateToken,
  hashPassword,
} from "../utils/auth.helper";
import { AppError, setErrorResponse } from "../utils/app-error";
import { CommonResponse } from "../utils/common-response";

const serializeUser = (user: User) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
});

export default class AuthController {
  signup = async (
    req: Request,
    res: Response
  ) => {
    const commonResponse = new CommonResponse();

    try {
      const {
        firstName,
        lastName,
        email,
        password,
      } = req.body;

      const existingUser = await User.findOne({
        where: {
          email: email.toLowerCase(),
        },
      });

      if (existingUser) {
        throw new AppError(
          400,
          "Account already exists."
        );
      }

      const hashedPassword =
        await hashPassword(password);

      const user = await User.create({
        firstName,
        lastName,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: UserRole.USER,
      });

      const token = generateToken({
        id: user.id,
        email: user.email,
      });

      commonResponse.status = 201;
      commonResponse.success = true;
      commonResponse.message =
        "Account created successfully";

      commonResponse.data = {
        user: serializeUser(user),
        token,
      };
    } catch (error: any) {
      setErrorResponse(commonResponse, error);
    }

    return res
      .status(commonResponse.status)
      .send(commonResponse);
  };

  login = async (
    req: Request,
    res: Response
  ) => {
    const commonResponse = new CommonResponse();

    try {
      const { email, password } =
        req.body;

      const user = await User.findOne({
        where: {
          email: email.toLowerCase(),
        },
      });

      if (
        !user ||
        !(await comparePassword(password, user.password))
      ) {
        throw new AppError(
          401,
          "Invalid email or password."
        );
      }

      const token = generateToken({
        id: user.id,
        email: user.email,
      });

      commonResponse.status = 200;
      commonResponse.success = true;
      commonResponse.message =
        "Login successfully";

      commonResponse.data = {
        user: serializeUser(user),
        token,
      };
    } catch (error: any) {
      setErrorResponse(commonResponse, error);
    }

    return res
      .status(commonResponse.status)
      .send(commonResponse);
  };

  me = async (
    req: AuthRequest,
    res: Response
  ) => {
    const commonResponse = new CommonResponse();

    try {
      const user = await User.findByPk(req.user?.id);

      if (!user) {
        throw new AppError(401, "Authentication required.");
      }

      commonResponse.status = 200;
      commonResponse.success = true;
      commonResponse.message =
        "Profile fetched successfully";
      commonResponse.data = serializeUser(user);
    } catch (error: any) {
      setErrorResponse(commonResponse, error);
    }

    return res
      .status(commonResponse.status)
      .send(commonResponse);
  };
}
