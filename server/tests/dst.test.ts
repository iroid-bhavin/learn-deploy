import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { SLOT_MINUTES } from "../src/config/booking";
import Resource from "../src/models/resource.model";
import { generateSlots } from "../src/services/availability.service";
import type { SlotInterval } from "../src/services/availability.service";
import {
  book,
  closeDatabase,
  createUser,
  getResource,
  getSlots,
  resetDatabase,
} from "./helpers";

// Guarantee 2 (part 2): availability stays correct across daylight-saving changes.

const utc = (slot: SlotInterval["start"]) =>
  slot.toUTC().toISO({ suppressMilliseconds: true });

// No gaps, no duplicates, and every slot is exactly SLOT_MINUTES of real time.
const expectContinuous = (slots: SlotInterval[]) => {
  for (const [i, slot] of slots.entries()) {
    expect(slot.end.diff(slot.start, "minutes").minutes).toBe(SLOT_MINUTES);
    if (i > 0) expect(slot.start.toMillis()).toBe(slots[i - 1].end.toMillis());
  }
};

const NIGHT = [{ startTime: "00:00", endTime: "04:00" }];

describe("DST: slot generation", () => {
  it("09:00 London is a different UTC instant in January and July", () => {
    const day = [{ startTime: "09:00", endTime: "17:00" }];

    expect(utc(generateSlots("Europe/London", "2026-01-12", day)[0].start)).toBe("2026-01-12T09:00:00Z");
    expect(utc(generateSlots("Europe/London", "2026-07-13", day)[0].start)).toBe("2026-07-13T08:00:00Z");
  });

  // Clocks change at 01:00 in London and 02:00 in New York; a 00:00-04:00 window covers both.
  it.each([
    ["Europe/London", "2026-03-29", 1, "2026-03-29T00:00:00Z", "2026-03-29T03:00:00Z"],
    ["America/New_York", "2026-03-08", 2, "2026-03-08T05:00:00Z", "2026-03-08T08:00:00Z"],
  ])(
    "spring forward in %s on %s: the skipped hour has no slots and nothing is lost",
    (zone, date, skippedHour, firstStart, lastEnd) => {
      const slots = generateSlots(zone, date, NIGHT);

      // 00:00 -> 04:00 local is only 3 real hours on this day.
      expect(slots).toHaveLength((3 * 60) / SLOT_MINUTES);
      expect(utc(slots[0].start)).toBe(firstStart);
      expect(utc(slots[slots.length - 1].end)).toBe(lastEnd);
      expectContinuous(slots);
      expect(slots.map((s) => s.start.setZone(zone).hour)).not.toContain(skippedHour);
    }
  );

  it.each([
    ["Europe/London", "2026-10-25", "01:00", "2026-10-24T23:00:00Z", "2026-10-25T04:00:00Z"],
    ["America/New_York", "2026-11-01", "01:00", "2026-11-01T04:00:00Z", "2026-11-01T09:00:00Z"],
  ])(
    "fall back in %s on %s: the repeated hour appears twice as two distinct instants",
    (zone, date, repeatedLabel, firstStart, lastEnd) => {
      const slots = generateSlots(zone, date, NIGHT);

      // 00:00 -> 04:00 local is 5 real hours on this day.
      expect(slots).toHaveLength((5 * 60) / SLOT_MINUTES);
      expect(utc(slots[0].start)).toBe(firstStart);
      expect(utc(slots[slots.length - 1].end)).toBe(lastEnd);
      expectContinuous(slots);

      const repeated = slots.filter((s) => s.start.setZone(zone).toFormat("HH:mm") === repeatedLabel);
      expect(repeated).toHaveLength(2);
      expect(repeated[0].start.toMillis()).not.toBe(repeated[1].start.toMillis());
    }
  );
});

describe("DST: through the API", () => {
  let token: string;

  beforeEach(async () => {
    await resetDatabase();
    token = (await createUser()).token;
  });

  afterAll(closeDatabase);

  it("seeded rooms keep their local opening time on both sides of each change", async () => {
    const roomA = await getResource("Room A"); // London: Mon 09:00, Fri 11:00
    const consultant = await getResource("Consultant C"); // New York: Mon-Fri 09:00
    const firstStart = async (resource: Resource, date: string) =>
      (await getSlots(token, resource.id, date))[0].startTime;

    // London spring forward 2026-03-29, fall back 2026-10-25.
    expect(await firstStart(roomA, "2026-03-27")).toBe("2026-03-27T11:00:00Z"); // Fri, GMT
    expect(await firstStart(roomA, "2026-03-30")).toBe("2026-03-30T08:00:00Z"); // Mon, BST
    expect(await firstStart(roomA, "2026-10-23")).toBe("2026-10-23T10:00:00Z"); // Fri, BST
    expect(await firstStart(roomA, "2026-10-26")).toBe("2026-10-26T09:00:00Z"); // Mon, GMT

    // New York spring forward 2026-03-08, fall back 2026-11-01.
    expect(await firstStart(consultant, "2026-03-06")).toBe("2026-03-06T14:00:00Z"); // EST
    expect(await firstStart(consultant, "2026-03-09")).toBe("2026-03-09T13:00:00Z"); // EDT
    expect(await firstStart(consultant, "2026-10-30")).toBe("2026-10-30T13:00:00Z"); // EDT
    expect(await firstStart(consultant, "2026-11-02")).toBe("2026-11-02T14:00:00Z"); // EST
  });

  // Room A and Consultant C are seeded open on Sunday 00:00-04:00, when the clocks change.
  describe("on the changeover night itself", () => {
    it.each([
      ["Room A", "2026-03-29", "01:"], // London skips 01:00-02:00
      ["Consultant C", "2026-03-08", "02:"], // New York skips 02:00-03:00
    ])("spring forward: %s offers no slot inside the missing hour on %s", async (name, date, missing) => {
      const resource = await getResource(name);
      const slots = await getSlots(token, resource.id, date);

      expect(slots).toHaveLength((3 * 60) / SLOT_MINUTES);
      expect(slots.some((s) => s.resourceLocal.start.startsWith(missing))).toBe(false);
    });

    it.each([
      ["Room A", "2026-10-25", [["2026-10-25T00:00:00Z", "+01:00"], ["2026-10-25T01:00:00Z", "+00:00"]]],
      ["Consultant C", "2026-11-01", [["2026-11-01T05:00:00Z", "-04:00"], ["2026-11-01T06:00:00Z", "-05:00"]]],
    ])("fall back: %s lists both 01:00 slots on %s and each can be booked", async (name, date, expected) => {
      const resource = await getResource(name);
      const slots = await getSlots(token, resource.id, date);
      const oneAm = slots.filter((s) => s.resourceLocal.start === "01:00");

      expect(slots).toHaveLength((5 * 60) / SLOT_MINUTES);
      expect(oneAm.map((s) => [s.startTime, s.resourceLocal.utcOffset])).toEqual(expected);

      for (const slot of oneAm) {
        await book(token, resource.id, slot.startTime, slot.endTime).expect(201);
      }
    });

    it("fall back: the slot the clocks go back in is a real 30 minutes and bookable", async () => {
      const roomA = await getResource("Room A");
      const slots = await getSlots(token, roomA.id, "2026-10-25");

      // Every interval is unique by its UTC instants.
      expect(new Set(slots.map((s) => `${s.startTime}/${s.endTime}`)).size).toBe(slots.length);

      // 01:30 BST -> 01:00 GMT: the local clock goes backwards, real time moves on 30 minutes.
      const crossing = slots.find((s) => s.resourceLocal.start === "01:30" && s.resourceLocal.end === "01:00")!;
      expect(crossing).toMatchObject({
        startTime: "2026-10-25T00:30:00Z",
        endTime: "2026-10-25T01:00:00Z",
        resourceLocal: { utcOffset: "+01:00" },
      });
      expect(Date.parse(crossing.endTime) - Date.parse(crossing.startTime)).toBe(SLOT_MINUTES * 60_000);

      await book(token, roomA.id, crossing.startTime, crossing.endTime).expect(201);
    });
  });
});
