import { sequelize } from "../config/db.js";

/**
 * Run `work(transaction)` inside a PostgreSQL transaction managed by
 * Sequelize. If the work function throws, the transaction is rolled back
 * automatically. Otherwise it is committed.
 */
export async function withTransaction(work) {
  return sequelize.transaction(async (transaction) => {
    return work(transaction);
  });
}

export default withTransaction;
