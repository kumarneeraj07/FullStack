import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

class Movie extends Model {}

Movie.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: "",
    },
    language: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    genres: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    certification: {
      type: DataTypes.STRING,
      defaultValue: "UA",
    },
    posterUrl: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    releaseDate: {
      type: DataTypes.DATEONLY,
    },
    ratingAverage: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    ratingCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "Movie",
    tableName: "movies",
    timestamps: true,
  }
);

export { Movie };
export default Movie;
