import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

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
    rows: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
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
