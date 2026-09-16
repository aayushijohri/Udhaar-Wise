import test from "node:test";
import assert from "node:assert/strict";
import { classifyMessage, parseOrder, ruleBasedParse } from "../../src/services/aiService.js";

test("AI Service intent classification fallback to rule engine", async () => {
  // Test fallback intent classification with unconfigured / offline AI keys
  const intent1 = await classifyMessage("Riya paid 400 rs");
  assert.equal(intent1, "PAYMENT");

  const intent2 = await classifyMessage("Priya ordered 4 chocolate cakes");
  assert.equal(intent2, "NEW_ORDER");

  const intent3 = await classifyMessage("Where is my order?");
  assert.equal(intent3, "ORDER_STATUS");
});

test("AI Service order parsing resiliency", async () => {
  const result = await parseOrder("2kg flour and 1kg sugar");
  assert.ok(result.items && result.items.length >= 1);
});
