import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { SLOT_MINUTES } from "../src/config/booking";
import Booking from "../src/models/booking.model";
import Resource from "../src/models/resource.model";
import {
  book,
  closeDatabase,
  createUser,
  getResource,
  plusMinutes,
  resetDatabase,
  slotFrom,
} from "./helpers";

// Guarantee 1: a resource can never be double-booked, even when requests race.
// Room A (Europe/London) is open Monday 09:00-17:00; 2026-01-12 is a Monday (GMT = UTC).
const SLOT = slotFrom("2026-01-12T10:00:00Z");

describe("no double booking (enforced by the database)", () => {
  let roomA: Resource;

  beforeEach(async () => {
    await resetDatabase();
    roomA = await getResource("Room A");
  });

  afterAll(closeDatabase);

  it("two parallel bookings for the same slot: exactly one succeeds, the other gets 409", async () => {
    const [alice, bob] = await Promise.all([createUser(), createUser()]);

    const responses = await Promise.all([
      book(alice.token, roomA.id, SLOT.start, SLOT.end),
      book(bob.token, roomA.id, SLOT.start, SLOT.end),
    ]);

    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    const loser = responses.find((r) => r.status === 409)!;
    expect(loser.body.message).toBe("This slot has already been booked.");
    expect(await Booking.count({ where: { resourceId: roomA.id } })).toBe(1);
  });

  it("ten parallel bookings for the same slot: exactly one succeeds, nine get 409", async () => {
    const users = await Promise.all(Array.from({ length: 10 }, () => createUser()));

    const responses = await Promise.all(
      users.map((user) => book(user.token, roomA.id, SLOT.start, SLOT.end))
    );
    const statuses = responses.map((r) => r.status);

    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(9);
    expect(await Booking.count({ where: { resourceId: roomA.id } })).toBe(1);
  });

  it("the exclusion constraint itself rejects an overlapping row (no application check involved)", async () => {
    const { id: userId } = await createUser();
    await Booking.create({
      userId,
      resourceId: roomA.id,
      startTime: new Date(SLOT.start),
      endTime: new Date(SLOT.end),
    });

    // Insert straight into the table, skipping all API validation.
    const halfSlot = SLOT_MINUTES / 2;
    await expect(
      Booking.create({
        userId,
        resourceId: roomA.id,
        startTime: new Date(plusMinutes(SLOT.start, halfSlot)),
        endTime: new Date(plusMinutes(SLOT.end, halfSlot)),
      })
    ).rejects.toMatchObject({ parent: { code: "23P01" } });
  });
});
