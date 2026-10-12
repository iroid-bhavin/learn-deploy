import {
  DataTypes,
  Model,
  Optional,
} from "sequelize";

import { sequelize } from "../config/db";

interface BookingAttributes {
  id: number;
  userId: number;
  resourceId: number;
  startTime: Date;
  endTime: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BookingCreationAttributes
  extends Optional<BookingAttributes, "id"> { }

class Booking
  extends Model<
    BookingAttributes,
    BookingCreationAttributes
  >
  implements BookingAttributes {
  declare id: number;
  declare userId: number;
  declare resourceId: number;
  declare startTime: Date;
  declare endTime: Date;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Booking.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // DataTypes.DATE is "timestamp with time zone" (timestamptz) in PostgreSQL.
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    endTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "bookings",
    timestamps: true,
    indexes: [{ fields: ["userId"] }],
  }
);

export default Booking;