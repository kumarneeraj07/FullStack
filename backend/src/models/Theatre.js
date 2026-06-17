import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

class Theatre extends Model {}

Theatre.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
  },
  {
    sequelize,
    modelName: "Theatre",
    tableName: "theatres",
    timestamps: true,
  }
);

export { Theatre };
export default Theatre;
