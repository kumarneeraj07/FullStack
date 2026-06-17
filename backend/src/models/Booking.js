import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

const isSqlite = sequelize.getDialect() === "sqlite";

class Booking extends Model {}

const seatsField = isSqlite
  ? {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const raw = this.getDataValue("seats");
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        try { return JSON.parse(raw); } catch { return []; }
      },
      set(val) {
        this.setDataValue("seats", JSON.stringify(val || []));
      },
    }
  : {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    };

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
    seats: seatsField,
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
