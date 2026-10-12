import dotenv from "dotenv";
import { vi } from "vitest";

dotenv.config();

process.env.DB_NAME = process.env.TEST_DB_NAME || "resource_booking_test";
process.env.JWT_SECRET ||= "test_secret";

// Tests pretend today is 1 Jan 2026, so the 2026 dates they use are never in the past.
vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true });
vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
