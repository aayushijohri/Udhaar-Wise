import test from "node:test";
import assert from "node:assert/strict";
import { parseOrder, ruleBasedParse, extractPaymentMode } from "../../src/services/aiService.js";

test("Hindi & Hinglish payment normalization and amount extraction", async () => {
  const samples = [
    { text: "Riya paid 400 rs", expectedAmount: 400 },
    { text: "Received ₹500 from Rahul", expectedAmount: 500 },
    { text: "Priya paid 1000 rupees via UPI", expectedAmount: 1000 },
    { text: "teen sau rupey paid by cash", expectedAmount: 300 },
    { text: "ek hazaar rupees gpay", expectedAmount: 1000 },
  ];

  for (const sample of samples) {
    const res = ruleBasedParse(sample.text);
    assert.equal(res.amount, sample.expectedAmount, `Failed amount extraction for: ${sample.text}`);
    assert.equal(res.intent, "PAYMENT", `Failed intent detection for: ${sample.text}`);
  }
});

test("Payment mode extraction", () => {
  assert.equal(extractPaymentMode("Paid via Paytm"), "paytm");
  assert.equal(extractPaymentMode("Sent using Google Pay"), "gpay");
  assert.equal(extractPaymentMode("Transferred by PhonePe"), "phonepe");
  assert.equal(extractPaymentMode("UPI transfer done"), "upi");
  assert.equal(extractPaymentMode("Paid in cash"), "cash");
});

test("Rule-based order parsing fallback", () => {
  const input = "2kg atta and 500 gm sugar";
  const result = ruleBasedParse(input);
  assert.equal(result.intent, "NEW_ORDER");
  assert.ok(result.items.length >= 1, "Should parse at least one item");
});
