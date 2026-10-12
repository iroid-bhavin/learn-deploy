import { CommonResponse } from "./common-response";

// Expected failure with an HTTP status (400, 403, 404, 409 ...).
export class AppError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// PostgreSQL error code for an exclusion constraint violation.
const EXCLUSION_VIOLATION = "23P01";

export const setErrorResponse = (
  commonResponse: CommonResponse,
  error: any
) => {
  commonResponse.success = false;
  commonResponse.data = [];

  if (error instanceof AppError) {
    commonResponse.status = error.status;
    commonResponse.message = error.message;
    return;
  }

  const pgCode = error?.parent?.code ?? error?.original?.code;

  if (pgCode === EXCLUSION_VIOLATION) {
    commonResponse.status = 409;
    commonResponse.message =
      "This slot has already been booked.";
    return;
  }

  console.error(error);
  commonResponse.status = 500;
  commonResponse.message = "Internal server error";
};
