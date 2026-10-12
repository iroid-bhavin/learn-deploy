import {
  DataTypes,
  Model,
  Optional,
} from "sequelize";

import { sequelize } from "../config/db";

interface ResourceAttributes {
  id: number;
  name: string;
  timezone: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ResourceCreationAttributes
  extends Optional<ResourceAttributes, "id"> { }

class Resource
  extends Model<
    ResourceAttributes,
    ResourceCreationAttributes
  >
  implements ResourceAttributes {
  declare id: number;
  declare name: string;
  declare timezone: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Resource.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "resources",
    timestamps: true,
  }
);

export default Resource;