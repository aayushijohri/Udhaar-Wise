import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../../src/index.js";

test("GET / - Health Check Endpoint", async () => {
  const res = await request(app).get("/");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "healthy");
  assert.ok(res.body.message.includes("Udhaar Wise"));
  assert.ok(res.headers["cache-control"].includes("no-store"));
});

test("GET /api/diagnostics - Diagnostics Endpoint", async () => {
  const res = await request(app).get("/api/diagnostics");
  assert.equal(res.status, 200);
  assert.ok(res.body.timestamp);
  assert.ok(res.body.services);
});

test("Protected routes return 401 without Bearer token", async () => {
  const endpoints = [
    "/api/customers",
    "/api/orders",
    "/api/inventory",
    "/api/dashboard/stats",
    "/api/payment-claims",
    "/api/notifications",
  ];

  for (const endpoint of endpoints) {
    const res = await request(app).get(endpoint);
    assert.equal(res.status, 401, `Expected 401 for ${endpoint}, got ${res.status}`);
    assert.equal(res.body.success, false);
  }
});

test("POST /api/ai/parse - Public AI Parsing Endpoint", async () => {
  const res = await request(app)
    .post("/api/ai/parse")
    .send({ text: "Customer Ram ordered 2 packets of milk for 60 rupees" });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data);
});

test("POST /api/ai/classify - Public Intent Classification Endpoint", async () => {
  const res = await request(app)
    .post("/api/ai/classify")
    .send({ text: "Paid 500 cash" });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.intent, "PAYMENT");
});
