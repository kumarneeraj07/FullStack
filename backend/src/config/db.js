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
    if (isProduction) {
      options.dialectOptions = {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      };
    }
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
 * Called once at server startup.
 */
export async function connectDB() {
  await sequelize.authenticate();
  console.log("PostgreSQL connected via Sequelize");
  await sequelize.sync();
  return sequelize;
}

export default connectDB;
