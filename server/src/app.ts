import express, { Request, Response } from "express";
import cors from "cors";

import AuthRouter from "./routes/auth.route";
import ResourceRouter from "./routes/resource.route";
import AvailabilityRouter from "./routes/availability.route";
import BookingRouter from "./routes/booking.route";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth Router
app.use("/api/auth", AuthRouter);

// Resource Router
app.use("/api/resources", ResourceRouter);

// Availability Router
app.use( "/api/resources", AvailabilityRouter);

// Booking Router
app.use("/api/bookings", BookingRouter);

app.use((req: Request, res: Response) => {
  res.status(404).send({
    success: false,
    status: 404,
    message: "Route not found",
    data: [],
  });
});

// Errors raised outside controllers, e.g. malformed JSON bodies.
app.use(
  (error: any, req: Request, res: Response) => {
    const status = error.status === 400 ? 400 : 500;
    res.status(status).send({
      success: false,
      status,
      message: status === 400 ? "Malformed request body" : "Internal server error",
      data: [],
    });
  }
);

export default app;
