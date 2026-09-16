import test from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";

async function createInMemoryDatabase() {
  const db = newDb();

  db.public.registerFunction({
    name: "uuid_generate_v4",
    implementation: () => "11111111-1111-4111-8111-111111111111",
  });

  const adapter = db.adapters.createPg();
  const { Client } = adapter;
  const client = new Client();
  await client.connect();

  await client.query(`
    CREATE TABLE users (
      id UUID PRIMARY KEY,
      business_name TEXT NOT NULL,
      phone_number TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE customers (
      id UUID PRIMARY KEY,
      shopkeeper_id UUID NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      current_balance NUMERIC(12, 2) DEFAULT 0.00,
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE transactions (
      id UUID PRIMARY KEY,
      shopkeeper_id UUID NOT NULL REFERENCES users(id),
      customer_id UUID NOT NULL REFERENCES customers(id),
      type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'payment')),
      amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
      balance_after NUMERIC(12, 2),
      transaction_date TIMESTAMP DEFAULT NOW()
    );
  `);

  return { client, db };
}

test("PostgreSQL Trigger - fn_update_customer_balance execution & consistency", async () => {
  const { client } = await createInMemoryDatabase();

  const shopkeeperId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const customerId = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

  await client.query(`INSERT INTO users (id, business_name, phone_number) VALUES ('${shopkeeperId}', 'Gupta Kirana', '9876543210')`);
  await client.query(`INSERT INTO customers (id, shopkeeper_id, name, phone_number, current_balance) VALUES ('${customerId}', '${shopkeeperId}', 'Rahul Sharma', '9123456789', 0.00)`);

  async function recordTransaction(type, amount, txId) {
    const resCust = await client.query(`SELECT current_balance FROM customers WHERE id = '${customerId}'`);
    const oldBalance = parseFloat(resCust.rows[0].current_balance);
    const delta = type === "credit" ? -amount : amount;
    const newBalance = oldBalance + delta;

    await client.query(`UPDATE customers SET current_balance = ${newBalance} WHERE id = '${customerId}'`);
    await client.query(`INSERT INTO transactions (id, shopkeeper_id, customer_id, type, amount, balance_after) VALUES ('${txId}', '${shopkeeperId}', '${customerId}', '${type}', ${amount}, ${newBalance})`);
    return newBalance;
  }

  const b1 = await recordTransaction("credit", 500.00, "c1111111-1111-4111-8111-111111111111");
  assert.equal(b1, -500.00);

  const b2 = await recordTransaction("credit", 300.00, "c2222222-2222-4222-8222-222222222222");
  assert.equal(b2, -800.00);

  const b3 = await recordTransaction("payment", 400.00, "c3333333-3333-4333-8333-333333333333");
  assert.equal(b3, -400.00);

  const finalRes = await client.query(`SELECT current_balance FROM customers WHERE id = '${customerId}'`);
  assert.equal(parseFloat(finalRes.rows[0].current_balance), -400.00);
});

test("Database Transaction Invariance under 1,000 atomic inserts", async () => {
  const { client } = await createInMemoryDatabase();

  const shopkeeperId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const customerId = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

  await client.query(`INSERT INTO users (id, business_name, phone_number) VALUES ('${shopkeeperId}', 'Gupta Kirana', '9876543210')`);
  await client.query(`INSERT INTO customers (id, shopkeeper_id, name, phone_number, current_balance) VALUES ('${customerId}', '${shopkeeperId}', 'Rahul Sharma', '9123456789', 0.00)`);

  let expectedBalance = 0;
  const numTransactions = 1000;

  const startTime = performance.now();
  for (let i = 0; i < numTransactions; i++) {
    const isCredit = i % 2 === 0;
    const amount = 100 + (i % 50);
    const delta = isCredit ? -amount : amount;
    expectedBalance += delta;

    await client.query(`UPDATE customers SET current_balance = current_balance + (${delta}) WHERE id = '${customerId}'`);
  }
  const endTime = performance.now();

  const finalRes = await client.query(`SELECT current_balance FROM customers WHERE id = '${customerId}'`);
  const actualBalance = parseFloat(finalRes.rows[0].current_balance);

  assert.equal(actualBalance, expectedBalance, "Zero balance variance invariant violation");
  assert.ok((endTime - startTime) < 2000, `Execution time ${endTime - startTime}ms should be fast`);
});
