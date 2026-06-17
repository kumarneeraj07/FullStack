import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

class SeatLock extends Model {}

SeatLock.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    showId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "shows", key: "id" },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    seat: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "SeatLock",
    tableName: "seat_locks",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["showId", "seat"],
      },
    ],
  }
);

export { SeatLock };
export default SeatLock;
