import {
  DataTypes,
  Model,
  Optional,
} from "sequelize";

import { sequelize } from "../config/db";

interface AvailabilityAttributes {
  id: number;
  resourceId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AvailabilityCreationAttributes
  extends Optional<AvailabilityAttributes, "id"> { }

class Availability
  extends Model<
    AvailabilityAttributes,
    AvailabilityCreationAttributes
  >
  implements AvailabilityAttributes {
  declare id: number;
  declare resourceId: number;
  declare dayOfWeek: number;
  declare startTime: string;
  declare endTime: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Availability.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    dayOfWeek: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // Local wall-clock times in the resource's timezone, not UTC.
    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },

    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "availabilities",
    timestamps: true,
    indexes: [{ fields: ["resourceId", "dayOfWeek"] }],
  }
);

export default Availability;