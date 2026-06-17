import { Sequelize } from "sequelize";
import { env } from "./env.js";

/**
 * Create or reuse a Sequelize instance, cached globally for serverless
 * warm starts so we don't open a new connection pool on every invocation.
 */
function getSequelize() {
  if (global.__sequelize) {
    return global.__sequelize;
  }

  const isProduction = env.nodeEnv === "production";
  const isSqlite = env.databaseUrl.startsWith("sqlite:");

  const options = {
    logging: isProduction ? false : false,
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
    options.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
      // Neon's connection pooler doesn't support prepared statements
      prepareThreshold: 0,
    };
    // Disable prepared statements at the pg level for Neon pooler compatibility
    options.dialectModule = undefined;
  }

  const sequelize = isSqlite
    ? new Sequelize(options)
    : new Sequelize(env.databaseUrl, options);

  global.__sequelize = sequelize;
  return sequelize;
}

export const sequelize = getSequelize();

/**
 * Authenticate the connection and sync models.
 * Called once at server startup. Uses alter:false to avoid DDL issues
 * with Neon's connection pooler.
 */
let synced = false;
export async function connectDB() {
  await sequelize.authenticate();
  if (!synced) {
    console.log("PostgreSQL connected via Sequelize");
    // Only create tables if they don't exist (no ALTER TABLE).
    // Tables are created by the seed script; this is just a safety net.
    await sequelize.sync({ alter: false });
    synced = true;
  }
  return sequelize;
}

export default connectDB;
