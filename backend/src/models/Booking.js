import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

class Booking extends Model {}

Booking.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    showId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "shows", key: "id" },
    },
    seats: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    },
    totalAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("confirmed", "cancelled"),
      defaultValue: "confirmed",
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize,
    modelName: "Booking",
    tableName: "bookings",
    timestamps: true,
  }
);

export { Booking };
export default Booking;
