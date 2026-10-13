import { DateTime } from "luxon";
import { Op } from "sequelize";

import { SLOT_MINUTES } from "../config/booking";
import Availability from "../models/availability.model";
import Booking from "../models/booking.model";
import Resource from "../models/resource.model";
import { AppError } from "../utils/app-error";

export interface SlotInterval {
  start: DateTime;
  end: DateTime;
}

export interface WeeklyRule {
  startTime: string;
  endTime: string;
}

export const parseResourceDate = (
  date: string,
  timezone: string
): DateTime => {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? DateTime.fromISO(date, { zone: timezone })
    : DateTime.invalid("format");

  if (!day.isValid) {
    throw new AppError(
      400,
      "Invalid date. Expected YYYY-MM-DD."
    );
  }

  return day.startOf("day");
};

export const toDayOfWeek = (day: DateTime) => day.weekday % 7;

const resolveLocalTime = (day: DateTime, time: string) => {
  const [hour, minute, second = 0] = time.split(":").map(Number);

  const resolved = day.set({ hour, minute, second, millisecond: 0 });

  if (resolved.hour === hour && resolved.minute === minute) {
    return resolved;
  }

  let jump = resolved;

  while (jump.minus({ minutes: 1 }).offset === resolved.offset) {
    jump = jump.minus({ minutes: 1 });
  }

  return jump;
};

export const generateSlots = (
  timezone: string,
  date: string,
  rules: WeeklyRule[]
): SlotInterval[] => {
  const day = parseResourceDate(date, timezone);
  const slots = new Map<number, SlotInterval>();

  for (const rule of rules) {
    const windowStart = resolveLocalTime(day, rule.startTime).toUTC();
    const windowEnd = resolveLocalTime(day, rule.endTime).toUTC();

    let start = windowStart;

    while (start.plus({ minutes: SLOT_MINUTES }) <= windowEnd) {
      const end = start.plus({ minutes: SLOT_MINUTES });
      slots.set(start.toMillis(), { start, end });
      start = end;
    }
  }

  return [...slots.values()].sort(
    (a, b) => a.start.toMillis() - b.start.toMillis()
  );
};

export const getResourceOrFail = async (resourceId: number) => {
  const resource = Number.isInteger(resourceId)
    ? await Resource.findByPk(resourceId)
    : null;

  if (!resource) {
    throw new AppError(404, "Resource not found.");
  }

  return resource;
};

export const getSlotIntervals = async (
  resource: Resource,
  date: string
) => {
  const day = parseResourceDate(date, resource.timezone);

  const rules = await Availability.findAll({
    where: {
      resourceId: resource.id,
      dayOfWeek: toDayOfWeek(day),
    },
  });

  return generateSlots(resource.timezone, date, rules);
};

export const isBookableSlot = async (
  resource: Resource,
  start: DateTime,
  end: DateTime
) => {
  const localDate = start
    .setZone(resource.timezone)
    .toISODate() as string;

  const slots = await getSlotIntervals(resource, localDate);

  return slots.some(
    (slot) =>
      slot.start.toMillis() === start.toMillis() &&
      slot.end.toMillis() === end.toMillis()
  );
};

export const toUtcIso = (value: DateTime | Date) =>
  (value instanceof Date ? DateTime.fromJSDate(value) : value)
    .toUTC()
    .toISO({ suppressMilliseconds: true }) as string;

export const getAvailability = async (
  resourceId: number,
  date: string
) => {
  const resource = await getResourceOrFail(resourceId);

  const intervals = await getSlotIntervals(resource, date);

  const bookings = intervals.length
    ? await Booking.findAll({
      where: {
        resourceId: resource.id,
        startTime: {
          [Op.lt]: intervals[intervals.length - 1].end.toJSDate(),
        },
        endTime: { [Op.gt]: intervals[0].start.toJSDate() },
      },
    })
    : [];

  const now = Date.now();

  const slots = intervals.map(({ start, end }) => {
    const booked = bookings.some(
      (booking) =>
        booking.startTime.getTime() < end.toMillis() &&
        booking.endTime.getTime() > start.toMillis()
    );

    // Same rule as booking validation: a slot that has started is no longer bookable.
    const past = start.toMillis() <= now;

    const local = start.setZone(resource.timezone);

    return {
      startTime: toUtcIso(start),
      endTime: toUtcIso(end),
      status: booked ? "booked" : past ? "past" : "available",
      resourceLocal: {
        start: local.toFormat("HH:mm"),
        end: end.setZone(resource.timezone).toFormat("HH:mm"),
        utcOffset: local.toFormat("ZZ"),
      },
    };
  });

  return {
    resource: {
      id: resource.id,
      name: resource.name,
      timezone: resource.timezone,
    },
    date,
    slotMinutes: SLOT_MINUTES,
    slots,
  };
};
