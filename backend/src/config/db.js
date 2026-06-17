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

  const sequelize = new Sequelize(env.databaseUrl, {
    dialect: "postgres",
    logging: isProduction ? false : console.log,
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
      acquire: 30000,
    },
    dialectOptions: isProduction
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
  });

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
