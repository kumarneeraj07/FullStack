import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

const isSqlite = sequelize.getDialect() === "sqlite";

class Movie extends Model {}

const genresField = isSqlite
  ? {
      type: DataTypes.TEXT,
      defaultValue: "[]",
      get() {
        const raw = this.getDataValue("genres");
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        try { return JSON.parse(raw); } catch { return []; }
      },
      set(val) {
        this.setDataValue("genres", JSON.stringify(val || []));
      },
    }
  : {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    };

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
    genres: genresField,
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
