import "dotenv/config";
import type { Request, Response } from "express";

import app from "../src/app";
import { syncDB } from "../src/config/db";
import { seedAdmin } from "../src/seed";

// Vercel serverless entry. DB sync + admin seed run once per cold start.
let ready: Promise<void> | null = null;

const init = () => {
  if (!ready) {
    ready = (async () => {
      await syncDB();
      await seedAdmin();
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
};

export default async function handler(req: Request, res: Response) {
  try {
    await init();
  } catch (error) {
    console.error("Database initialization failed:", error);
    res.status(500).send({
      success: false,
      status: 500,
      message: "Database unavailable",
      data: [],
    });
    return;
  }
  return app(req, res);
}
