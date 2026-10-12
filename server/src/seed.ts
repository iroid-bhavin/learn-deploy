import "dotenv/config";

import { sequelize, syncDB } from "./config/db";
import { DayOfWeek, UserRole } from "./models/common.model";
import Availability from "./models/availability.model";
import Resource from "./models/resource.model";
import User from "./models/user.model";
import { hashPassword } from "./utils/auth.helper";

interface SeedRule {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

interface SeedResource {
  name: string;
  timezone: string;
  rules: SeedRule[];
}

const sameHours = (
  from: DayOfWeek,
  to: DayOfWeek,
  startTime: string,
  endTime: string
): SeedRule[] =>
  Array.from({ length: to - from + 1 }, (_, i) => ({
    dayOfWeek: from + i,
    startTime,
    endTime,
  }));

const SUNDAY_NIGHT: SeedRule = {
  dayOfWeek: DayOfWeek.SUNDAY,
  startTime: "00:00",
  endTime: "04:00",
};

export const SEED_RESOURCES: SeedResource[] = [
  {
    name: "Room A",
    timezone: "Europe/London",
    rules: [
      SUNDAY_NIGHT,
      { dayOfWeek: DayOfWeek.MONDAY, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: DayOfWeek.WEDNESDAY, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: DayOfWeek.FRIDAY, startTime: "11:00", endTime: "19:00" },
    ],
  },
  {
    name: "Room B",
    timezone: "Asia/Kolkata",
    rules: sameHours(DayOfWeek.TUESDAY, DayOfWeek.FRIDAY, "10:00", "18:00"),
  },
  {
    name: "Consultant C",
    timezone: "America/New_York",
    rules: [
      SUNDAY_NIGHT,
      ...sameHours(DayOfWeek.MONDAY, DayOfWeek.FRIDAY, "09:00", "16:00"),
    ],
  },
];

export const seed = async () => {
  for (const item of SEED_RESOURCES) {
    const [resource] = await Resource.findOrCreate({
      where: { name: item.name },
      defaults: { name: item.name, timezone: item.timezone },
    });

    await sequelize.transaction(async (transaction) => {
      await Availability.destroy({
        where: { resourceId: resource.id },
        transaction,
      });

      await Availability.bulkCreate(
        item.rules.map((rule) => ({ resourceId: resource.id, ...rule })),
        { transaction }
      );
    });
  }
};

export const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn("ADMIN_EMAIL / ADMIN_PASSWORD not set; no admin user seeded.");
    return;
  }

  const existing = await User.findOne({ where: { email } });

  if (existing) {
    if (existing.role !== UserRole.ADMIN) {
      await existing.update({ role: UserRole.ADMIN });
    }
    return;
  }

  await User.create({
    firstName: "Admin",
    lastName: "User",
    email,
    password: await hashPassword(password),
    role: UserRole.ADMIN,
  });
  console.log(`Admin user ${email} created.`);
};

if (require.main === module) {
  (async () => {
    await syncDB();
    await seed();
    await seedAdmin();
    console.log("Seed completed.");
    await sequelize.close();
  })().catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
}
