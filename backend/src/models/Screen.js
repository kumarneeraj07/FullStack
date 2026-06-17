import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

const isSqlite = sequelize.getDialect() === "sqlite";

class Screen extends Model {
  /**
   * Virtual getter: total seat capacity of the screen.
   */
  get capacity() {
    const rows = this.getDataValue("rows");
    if (!rows || !Array.isArray(rows)) return 0;
    return rows.reduce((sum, r) => sum + r.seats, 0);
  }
}

const rowsField = isSqlite
  ? {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const raw = this.getDataValue("rows");
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        try { return JSON.parse(raw); } catch { return []; }
      },
      set(val) {
        this.setDataValue("rows", JSON.stringify(val || []));
      },
    }
  : {
      type: DataTypes.JSONB,
      allowNull: false,
    };

Screen.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    theatreId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "theatres", key: "id" },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rows: rowsField,
  },
  {
    sequelize,
    modelName: "Screen",
    tableName: "screens",
    timestamps: true,
  }
);

export { Screen };
export default Screen;
