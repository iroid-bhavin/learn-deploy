import { Sequelize } from "sequelize";

const sequelize = new Sequelize(
  process.env.DB_NAME as string,
  process.env.DB_USER as string,
  process.env.DB_PASSWORD as string,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: "postgres",
    logging: false,
    pool: {
      max: 10,
    },
  }
);

const applyConstraints = async () => {
  await sequelize.query(
    "CREATE EXTENSION IF NOT EXISTS btree_gist;"
  );

  const constraints: { name: string; table: string; sql: string }[] = [
    {
      name: "users_role_valid",
      table: "users",
      sql: `CHECK (role IN (0, 1))`,
    },
    {
      name: "availabilities_day_of_week_range",
      table: "availabilities",
      sql: `CHECK ("dayOfWeek" BETWEEN 0 AND 6)`,
    },
    {
      name: "availabilities_time_order",
      table: "availabilities",
      sql: `CHECK ("endTime" > "startTime")`,
    },
    {
      name: "bookings_time_order",
      table: "bookings",
      sql: `CHECK ("endTime" > "startTime")`,
    },
    {
      name: "bookings_no_overlap",
      table: "bookings",
      sql: `EXCLUDE USING gist (
        "resourceId" WITH =,
        tstzrange("startTime", "endTime", '[)') WITH &&
      )`,
    },
  ];

  for (const constraint of constraints) {
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = '${constraint.name}'
        ) THEN
          ALTER TABLE ${constraint.table}
            ADD CONSTRAINT ${constraint.name} ${constraint.sql};
        END IF;
      END $$;
    `);
  }
};

const syncDB = async () => {
  await import("../models");
  await sequelize.authenticate();
  await sequelize.sync();
  await applyConstraints();
};

const connectDB = async () => {
  try {
    await syncDB();
    console.log("PostgreSQL connected and synchronized successfully.");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

export default connectDB;
export { sequelize, syncDB };
