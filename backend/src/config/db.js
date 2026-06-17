import { Sequelize } from "sequelize";
import pg from "pg";
import { env } from "./env.js";

/**
 * Create or reuse a Sequelize instance, cached globally for serverless
 * warm starts so we don't open a new connection pool on every invocation.
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
    // Explicitly set dialect to "postgres" (not "postgresql" which comes from URL parsing)
    options.dialect = "postgres";
    // Pass pg module directly so Vercel's bundler includes it
    options.dialectModule = pg;
    options.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    };
  }

  // Normalize the URL: replace "postgresql://" with "postgres://" 
  // because Sequelize only recognizes "postgres" as a dialect name
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
 * Authenticate the connection and sync models.
 * Called once at server startup.
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
