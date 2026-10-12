import { DateTime } from "luxon";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { SLOT_MINUTES } from "../src/config/booking";
import Booking from "../src/models/booking.model";
import Resource from "../src/models/resource.model";
import {
  book,
  closeDatabase,
  createUser,
  getResource,
  getSlots,
  resetDatabase,
} from "./helpers";

// Guarantee 2 (part 1): availability is computed in the resource's timezone,
// every instant is stored in UTC, and any client offset is accepted.
const inKolkata = (iso: string) =>
  DateTime.fromISO(iso, { zone: "Asia/Kolkata" }).toISO({ suppressMilliseconds: true })!;

describe("booking across timezones", () => {
  let roomA: Resource;
  let token: string;

  beforeEach(async () => {
    await resetDatabase();
    roomA = await getResource("Room A");
    token = (await createUser()).token;
  });

  afterAll(closeDatabase);

  it("an Asia/Kolkata user books a Europe/London room at the right instant", async () => {
    // Room A opens 09:00 London. On Monday 2026-01-12 (GMT) that is 09:00Z = 14:30 in Kolkata.
    const [first] = await getSlots(token, roomA.id, "2026-01-12");
    expect(first.startTime).toBe("2026-01-12T09:00:00Z");
    expect(first.resourceLocal).toMatchObject({ start: "09:00", utcOffset: "+00:00" });

    // The Kolkata browser sends local times with their offset.
    const start = inKolkata(first.startTime);
    const end = inKolkata(first.endTime);
    expect(start).toBe("2026-01-12T14:30:00+05:30");

    const response = await book(token, roomA.id, start, end).expect(201);

    expect(response.body.data.startTime).toBe("2026-01-12T09:00:00Z");
    const stored = await Booking.findByPk(response.body.data.id);
    expect(stored!.startTime.toISOString()).toBe("2026-01-12T09:00:00.000Z");
    expect(stored!.endTime.getTime() - stored!.startTime.getTime()).toBe(SLOT_MINUTES * 60_000);
  });

  it("rejects a Kolkata booking that falls outside London working hours", async () => {
    // 14:00 Kolkata = 08:30 London, before Room A opens.
    const start = "2026-01-12T14:00:00+05:30";
    const end = DateTime.fromISO(start, { setZone: true })
      .plus({ minutes: SLOT_MINUTES })
      .toISO({ suppressMilliseconds: true })!;

    await book(token, roomA.id, start, end).expect(400);
  });

  it("uses each resource's own timezone for its opening hours", async () => {
    const roomB = await getResource("Room B");

    // Room B opens 10:00 Asia/Kolkata (+05:30, no DST) on Tuesdays = 04:30Z.
    const [first] = await getSlots(token, roomB.id, "2026-01-13");
    expect(first.startTime).toBe("2026-01-13T04:30:00Z");
    expect(first.resourceLocal).toMatchObject({ start: "10:00", utcOffset: "+05:30" });
  });

  it("rejects times without an offset instead of guessing they are UTC", async () => {
    await book(token, roomA.id, "2026-01-12T09:00:00", "2026-01-12T09:30:00").expect(400);
    expect(await Booking.count()).toBe(0);
  });
});
