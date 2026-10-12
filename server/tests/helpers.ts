import request from "supertest";

import app from "../src/app";
import { SLOT_MINUTES } from "../src/config/booking";
import { sequelize, syncDB } from "../src/config/db";
import Resource from "../src/models/resource.model";
import { seed } from "../src/seed";

export const api = () => request(app);

// Fresh schema + seeded resources for every test.
export const resetDatabase = async () => {
  await syncDB();
  await sequelize.query(
    "TRUNCATE bookings, availabilities, resources, users RESTART IDENTITY CASCADE"
  );
  await seed();
};

export const closeDatabase = () => sequelize.close();

export const getResource = async (name: string) => {
  const resource = await Resource.findOne({ where: { name } });

  if (!resource) {
    throw new Error(`Seed resource ${name} missing`);
  }

  return resource;
};

let userCounter = 0;

// Signs up through the real auth endpoint and returns the JWT.
export const createUser = async () => {
  userCounter += 1;

  const response = await api()
    .post("/api/auth/signup")
    .send({
      firstName: "Test",
      lastName: "User",
      email: `user${userCounter}-${Date.now()}@example.com`,
      password: "password123",
    })
    .expect(201);

  return {
    id: response.body.data.user.id as number,
    token: response.body.data.token as string,
  };
};

export const bearer = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

// Tests derive times from SLOT_MINUTES so they keep passing if the slot length changes.
export const plusMinutes = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() + minutes * 60_000)
    .toISOString()
    .replace(".000Z", "Z");

export const slotFrom = (start: string) => ({
  start,
  end: plusMinutes(start, SLOT_MINUTES),
});

export const getSlots = async (token: string, resourceId: number, date: string) =>
  (
    await api()
      .get(`/api/resources/${resourceId}/availability`)
      .query({ date })
      .set(bearer(token))
      .expect(200)
  ).body.data.slots as {
    startTime: string;
    endTime: string;
    status: "available" | "booked" | "past";
    resourceLocal: { start: string; end: string; utcOffset: string };
  }[];

export const book = (
  token: string,
  resourceId: number,
  startTime: string,
  endTime: string
) =>
  api()
    .post("/api/bookings")
    .set(bearer(token))
    .send({ resourceId, startTime, endTime });
