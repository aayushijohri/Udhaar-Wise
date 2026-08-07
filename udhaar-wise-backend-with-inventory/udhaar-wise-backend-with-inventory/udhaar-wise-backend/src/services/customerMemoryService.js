import fs from "fs";
import os from "os";
import path from "path";
import { supabaseAdmin as supabase } from "../config/supabase.js";
import { ai, groq, GROQ_TEXT_MODEL } from "./aiService.js";

const MEMORY_FILE_PATH = path.join(os.tmpdir(), "udhaar-wise-customer-memory.json");

// Ensure directories and files exist
function ensureFile() {
  const dir = path.dirname(MEMORY_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(MEMORY_FILE_PATH)) {
    fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify({}));
  }
}

export function readMemoryFile() {
  ensureFile();
  try {
    const raw = fs.readFileSync(MEMORY_FILE_PATH, "utf8");
    return JSON.parse(raw || "{}");
  } catch (err) {
    console.error("Error reading memory file:", err);
    return {};
  }
}

export function writeMemoryFile(data) {
  ensureFile();
  try {
    fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing memory file:", err);
  }
}

export async function updateCustomerMemory(shopkeeperId, customerId) {
  try {
    // 1. Fetch customer details
    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .select("name, phone_number, current_balance")
      .eq("id", customerId)
      .maybeSingle();

    if (custErr || !customer) {
      console.error("[Memory] Customer not found:", customerId);
      return;
    }

    // 2. Fetch customer orders plus items
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("id, final_amount, created_at, order_status, paid_amount, payment_status, notes, order_items(quantity, unit_price, inventory(item_name))")
      .eq("customer_id", customerId);

    if (ordersErr) {
      console.error("[Memory] Error fetching orders:", ordersErr);
      return;
    }

    // 3. Fetch payment claims
    const { data: claims } = await supabase
      .from("payment_claims")
      .select("amount, payment_mode, raw_message, status, created_at")
      .eq("customer_id", customerId);

    const totalOrders = orders ? orders.length : 0;
    const totalSpending = (orders || []).reduce((sum, o) => sum + Number(o.final_amount || 0), 0);

    const ordersParsed = (orders || []).map((o) => ({
      date: o.created_at,
      status: o.order_status,
      amount: o.final_amount,
      payment_status: o.payment_status,
      notes: o.notes,
      items: (o.order_items || []).map((i) => `${i.inventory?.item_name || "item"} x${i.quantity}`).join(", "),
    }));

    const prompt = `Analyze historical order data and generate a structured business memory profile for customer ${customer.name}.
Total Orders: ${totalOrders}
Total Spending: ₹${totalSpending}
Outstanding Balance: ₹${customer.current_balance || 0}
Order History: ${JSON.stringify(ordersParsed.slice(0, 15))}
Payment Claims: ${JSON.stringify((claims || []).slice(0, 15))}

You must return a valid JSON object matching exactly this structure:
{
  "favorite_products": "comma-separated list of top items they love, e.g. 'Chocolate Cake'",
  "buy_frequency": "estimate how often they purchase, e.g. 'Every weekend'",
  "average_bill": "average spent per order, e.g. '₹450'",
  "preferred_day": "preferred purchase day of week, e.g. 'Saturdays'",
  "preferred_time": "preferred time window, e.g. 'Evening 5 PM'",
  "preferred_payment_method": "payment mode preference, e.g. 'UPI/GPay'",
  "credit_behaviour": "reliability insight, e.g. 'Pays on receipt via UPI'",
  "special_events": "customer birthday, festivals, or special dates, e.g. 'Mother birthday next week'",
  "preferences": "specific customizations/likes, e.g. 'Eggless, low sugar'",
  "dislikes": "explicit customer dislikes/complaints, e.g. 'No colorings, no nuts'",
  "custom_requests": "special instructions, e.g. 'Deliver before noon'",
  "repeat_score": "customer repeat ordering rating out of 100, e.g. '85'",
  "risk_score": "credit or payment risk rating out of 100, e.g. '12'",
  "lifetime_spend": "total amount spent, e.g. '₹2,500'",
  "predicted_next_purchase": "estimated next order date, e.g. 'Aug 12, 2026'",
  "ai_suggestions": "actionable marketing recommendation, e.g. 'Offer 10% off Chocolate Cake'"
}

Rules:
1. Do NOT use first-person sentences (such as "I recommend", "We appreciate", "Our loyal customer", "Thank you Jane").
2. No conversational fluff or greetings. Use strictly dry, factual, objective, business insights.
3. Every value should be 2-6 words maximum.`;

    let parsedResult = null;
    try {
      const response = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
      const raw = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(raw);
    } catch {
      try {
        const res = await groq.chat.completions.create({
          model: GROQ_TEXT_MODEL,
          messages: [{ role: "user", content: prompt }],
        });
        const raw = res.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
        parsedResult = JSON.parse(raw);
      } catch (err) {
        console.error("[Memory] AI extraction failed, fallback logic used.", err);
      }
    }

    if (!parsedResult) {
      // Basic fallback
      parsedResult = {
        favorite_products: totalOrders > 0 ? "General items" : "None yet",
        buy_frequency: totalOrders > 5 ? "Regular" : "Occasional",
        average_bill: `₹${totalOrders > 0 ? Math.round(totalSpending / totalOrders) : 0}`,
        preferred_day: "Weekends",
        preferred_time: "Evening hours",
        preferred_payment_method: "Cash/UPI",
        credit_behaviour: Number(customer.current_balance) < 0 ? "Prompt payment" : "Slow clearance",
        special_events: "Birthdays",
        preferences: "Standard specifications",
        dislikes: "None noted",
        custom_requests: "None",
        repeat_score: totalOrders > 5 ? "85" : "45",
        risk_score: Number(customer.current_balance) < -2000 ? "40" : "10",
        lifetime_spend: `₹${totalSpending}`,
        predicted_next_purchase: "Scheduled",
        ai_suggestions: "Recommend standard promotional discount",
      };
    }

    const allMemories = readMemoryFile();
    allMemories[`${shopkeeperId}:${customerId}`] = parsedResult;
    writeMemoryFile(allMemories);
    console.log(`[Memory] Updated memory for customer ${customerId}`);

  } catch (err) {
    console.error("[Memory] Error in updateCustomerMemory:", err);
  }
}

export function getCustomerMemoryData(shopkeeperId, customerId) {
  const allMemories = readMemoryFile();
  return allMemories[`${shopkeeperId}:${customerId}`] || null;
}
