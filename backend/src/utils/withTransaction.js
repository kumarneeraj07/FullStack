import mongoose from "mongoose";

/**
 * Run `work(session)` inside a MongoDB transaction when the server supports
 * it (replica set / Atlas). On a standalone mongod, transactions are not
 * available, so we transparently fall back to running the same work without
 * a session. The core double-booking guard does not rely on transactions —
 * it relies on atomic single-document updates — so correctness is preserved
 * either way; the transaction only bundles the multi-document write.
 */
export async function withTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (err) {
    const noTxn =
      err?.code === 20 || // IllegalOperation: Transaction numbers...
      /Transaction numbers are only allowed|replica set|not supported/i.test(err?.message || "");
    if (noTxn) {
      // Fallback: run without a session.
      return work(null);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

export default withTransaction;
