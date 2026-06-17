import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

class Show extends Model {}

Show.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    movieId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "movies", key: "id" },
    },
    theatreId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "theatres", key: "id" },
    },
    screenId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "screens", key: "id" },
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    format: {
      type: DataTypes.ENUM("2D", "3D", "IMAX"),
      defaultValue: "2D",
    },
    language: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bookedSeats: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
  },
  {
    sequelize,
    modelName: "Show",
    tableName: "shows",
    timestamps: true,
  }
);

export { Show };
export default Show;
