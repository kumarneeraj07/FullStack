import { Sequelize } from "sequelize";
import pg from "pg";
import { env } from "./env.js";

/**
 * Create or reuse a Sequelize instance.
 */
function getSequelize() {
  if (global.__sequelize) {
    return global.__sequelize;
  }

  const isSqlite = env.databaseUrl.startsWith("sqlite:");

  const options = {
    logging: false,
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
      acquire: 30000,
    },
  };

  if (isSqlite) {
    options.dialect = "sqlite";
    options.storage = ":memory:";
  } else {
    options.dialect = "postgres";
    options.dialectModule = pg;
    // Only use SSL if connecting to a cloud provider (not local)
    if (env.databaseUrl.includes("neon.tech") || env.databaseUrl.includes("supabase") || env.nodeEnv === "production") {
      options.dialectOptions = {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      };
    }
  }

  // Normalize: "postgresql://" -> "postgres://" for Sequelize compatibility
  let dbUrl = env.databaseUrl;
  if (dbUrl.startsWith("postgresql://")) {
    dbUrl = dbUrl.replace("postgresql://", "postgres://");
  }

  const sequelize = isSqlite
    ? new Sequelize(options)
    : new Sequelize(dbUrl, options);

  global.__sequelize = sequelize;
  return sequelize;
}

export const sequelize = getSequelize();

/**
 * Authenticate and sync tables.
 */
let synced = false;
export async function connectDB() {
  await sequelize.authenticate();
  if (!synced) {
    console.log("PostgreSQL connected via Sequelize");
    await sequelize.sync({ alter: false });
    synced = true;
  }
  return sequelize;
}

export default connectDB;
