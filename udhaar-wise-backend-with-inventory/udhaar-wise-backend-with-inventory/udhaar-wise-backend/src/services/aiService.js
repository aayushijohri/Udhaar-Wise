import { ai } from "../config/gemini.js";
import { groq } from "../config/groq.js";

const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 1000;

export const INTENTS = {
  NEW_ORDER: "NEW_ORDER",
  PAYMENT: "PAYMENT",
  INVENTORY_PURCHASE: "INVENTORY_PURCHASE",
  INVENTORY_UPDATE: "INVENTORY_UPDATE",
  ORDER_STATUS: "ORDER_STATUS",
  GENERAL_MESSAGE: "GENERAL_MESSAGE",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractAmount(text) {
  const patterns = [
    /(?:for|at|₹|rs\.?|rupees?)\s*(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*(?:rs\.?|rupees?|₹)/i,
    /(?:paid|received|payment of)\s*(\d+(?:\.\d+)?)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

function ruleBasedParse(text) {
  console.log("[AI] Using rule-based parser as fallback");
  const lowerText = text.toLowerCase();

  let intent = INTENTS.GENERAL_MESSAGE;

  if (
    lowerText.includes("paid") ||
    lowerText.includes("payment") ||
    lowerText.includes("paisa") ||
    lowerText.includes("received") ||
    /^(customer\s+)?paid\b/i.test(text.trim())
  ) {
    intent = INTENTS.PAYMENT;
  } else if (
    lowerText.includes("bought") ||
    lowerText.includes("purchase") ||
    lowerText.includes("procured") ||
    /bought\s+\d+/i.test(text)
  ) {
    intent = INTENTS.INVENTORY_PURCHASE;
  } else if (
    lowerText.includes("stock") &&
    (lowerText.includes("update") || lowerText.includes("add") || lowerText.includes("increase"))
  ) {
    intent = INTENTS.INVENTORY_UPDATE;
  } else if (lowerText.includes("status") || lowerText.includes("where is my order")) {
    intent = INTENTS.ORDER_STATUS;
  } else if (/\d+/.test(text) && /[a-z]/i.test(text)) {
    intent = INTENTS.NEW_ORDER;
  }

  const items = [];
  const orderPatterns = [
    /(\d+)\s+([a-zA-Z][a-zA-Z\s]*?)(?:\s+for|\s+at|\s*$|,)/gi,
    /(\d+)\s*(kg|g|l|ml|pcs|pieces?|cakes?|dozen)\s+([a-zA-Z][a-zA-Z\s]*)/gi,
    /(\d+)\s+([a-zA-Z][a-zA-Z\s]+)/g,
  ];

  for (const pattern of orderPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const quantity = parseInt(match[1], 10);
      const unit = match[3] ? match[2] : match[2]?.match(/^(kg|g|l|ml|pcs|pieces?)$/i) ? match[2] : "";
      const product = (match[3] || match[2] || "").trim().replace(/\s+(for|at)$/i, "");
      if (quantity > 0 && product.length > 1 && !/^(rs|rupees|paid|for|at)$/i.test(product)) {
        items.push({ product, quantity, unit: unit || "" });
      }
    }
    if (items.length > 0) break;
  }

  const amount = extractAmount(text);

  return {
    intent,
    customer_name: null,
    items,
    amount,
    notes: text,
  };
}

async function detectIntentWithProvider(text, provider) {
  const prompt = `
Classify the following business message into exactly one intent:
- NEW_ORDER: Customer placing an order (e.g. "2 chocolate cakes")
- PAYMENT: Payment made or confirmation (e.g. "Paid 500", "Customer paid", "Received 500")
- INVENTORY_PURCHASE: Owner buying inventory (e.g. "Bought 20 kg atta for 500")
- INVENTORY_UPDATE: Owner updating inventory levels
- ORDER_STATUS: Asking about order status
- GENERAL_MESSAGE: General conversation

Message: ${text}

Return ONLY the intent name (e.g., NEW_ORDER).
`;

  if (provider === "gemini") {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
    });
    const result = response.text.replace(/```/g, "").trim().toUpperCase();
    return Object.values(INTENTS).includes(result) ? result : INTENTS.GENERAL_MESSAGE;
  }

  const response = await groq.chat.completions.create({
    model: "llama3-8b-8192",
    messages: [{ role: "user", content: prompt }],
  });
  const result = response.choices[0].message.content.replace(/```/g, "").trim().toUpperCase();
  return Object.values(INTENTS).includes(result) ? result : INTENTS.GENERAL_MESSAGE;
}

async function detectIntent(text) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[AI] Intent detection attempt ${attempt + 1} with Gemini`);
      return await detectIntentWithProvider(text, "gemini");
    } catch (error) {
      lastError = error;
      console.error(`[AI] Gemini intent attempt ${attempt + 1} failed:`, error.message);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  try {
    console.log("[AI] Falling back to Groq for intent detection");
    return await detectIntentWithProvider(text, "groq");
  } catch (error) {
    console.error("[AI] Groq intent failed:", error.message);
  }

  console.log("[AI] Using rule-based intent detection");
  return ruleBasedParse(text).intent;
}

async function parseOrderWithAI(text, provider = "gemini") {
  const prompt = `
You are an AI assistant for Indian shopkeepers.

Extract customer orders from English, Hindi, or Hinglish.

Return ONLY valid JSON.

Format:
{
  "customer_name": null,
  "items": [
    {
      "product": "",
      "quantity": 0,
      "unit": ""
    }
  ],
  "amount": null,
  "delivery_date": "",
  "notes": ""
}

Rules:
- Extract amount whenever mentioned (e.g. "5 cakes for 500" -> amount: 500)
- If no amount mentioned, set amount to null (not 0)
- "2 chocolate cakes" -> items with product "chocolate cake", quantity 2

Order:
${text}
`;

  let response;
  if (provider === "gemini") {
    response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
    });
    const result = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(result);
    if (parsed.amount === 0) parsed.amount = null;
    return parsed;
  }

  response = await groq.chat.completions.create({
    model: "llama3-8b-8192",
    messages: [{ role: "user", content: prompt }],
  });
  const result = response.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(result);
  if (parsed.amount === 0) parsed.amount = null;
  return parsed;
}

export async function parseOrder(text) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[AI] Parse attempt ${attempt + 1}/${MAX_RETRIES + 1} with Gemini`);
      const result = await parseOrderWithAI(text, "gemini");
      console.log("[AI] Gemini parse succeeded");
      return result;
    } catch (error) {
      console.error(`[AI] Gemini parse attempt ${attempt + 1} failed:`, error.message);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      break;
    }
  }

  try {
    console.log("[AI] Attempting Groq parse fallback");
    const result = await parseOrderWithAI(text, "groq");
    console.log("[AI] Groq parse succeeded");
    return result;
  } catch (error) {
    console.error("[AI] Groq parse failed:", error.message);
  }

  console.log("[AI] All AI failed, using rule-based parser");
  const fallback = ruleBasedParse(text);
  return {
    customer_name: fallback.customer_name,
    items: fallback.items,
    amount: fallback.amount,
    notes: fallback.notes,
  };
}

export async function classifyMessage(text) {
  return detectIntent(text);
}

export { ruleBasedParse };

export async function generateCustomerMemory(customerData) {
  const { name, totalOrders, totalSpending, lastPurchaseDate, currentBalance } = customerData;

  const prompt = `
Generate a brief customer memory summary for a shopkeeper's customer.

Customer data:
- Name: ${name}
- Total orders: ${totalOrders}
- Total spending: ₹${totalSpending}
- Last purchase: ${lastPurchaseDate || "Never"}
- Outstanding balance: ₹${currentBalance}

Return ONLY a 1-2 sentence summary in a friendly tone.
Example: "Amit usually orders Paneer dishes during weekends and spends around ₹450."
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
    });
    return response.text.replace(/```/g, "").trim();
  } catch (error) {
    console.error("[AI] Customer memory generation failed, trying Groq:", error.message);
    try {
      const response = await groq.chat.completions.create({
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }],
      });
      return response.choices[0].message.content.replace(/```/g, "").trim();
    } catch {
      if (totalOrders === 0) return `${name} is a new customer with no orders yet.`;
      return `${name} has placed ${totalOrders} orders and spent ₹${totalSpending}${currentBalance > 0 ? ` with ₹${currentBalance} outstanding` : ""}.`;
    }
  }
}

export function generateCustomerTimeline(orders) {
  if (!orders || orders.length === 0) {
    return [];
  }

  const sortedOrders = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return sortedOrders.slice(0, 5).map((order) => ({
    date: new Date(order.created_at).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    title: `Order ${order.order_number || order.id?.slice(0, 8).toUpperCase()}`,
    amount: order.final_amount != null && Number(order.final_amount) > 0 ? `₹${order.final_amount}` : "—",
    status: order.order_status || "pending",
  }));
}

export async function generateCustomerInsights(customerData) {
  const { name, totalOrders, totalSpending, currentBalance } = customerData;

  const prompt = `
Generate customer insights for a shopkeeper.

Customer data:
- Name: ${name}
- Total orders: ${totalOrders}
- Total spending: ₹${totalSpending}
- Outstanding balance: ₹${currentBalance}
- Average order value: ₹${totalOrders > 0 ? Math.round(totalSpending / totalOrders) : 0}

Return ONLY valid JSON with this format:
{
  "paymentBehaviour": "brief description",
  "favouriteProducts": "brief description",
  "riskLevel": "Low/Medium/High",
  "suggestedFollowUp": "brief suggestion"
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
    });
    const result = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(result);
  } catch (error) {
    console.error("[AI] Customer insights failed, trying Groq:", error.message);
    try {
      const response = await groq.chat.completions.create({
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }],
      });
      const result = response.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(result);
    } catch {
      const riskLevel = currentBalance > 5000 ? "High" : currentBalance > 2000 ? "Medium" : "Low";
      return {
        paymentBehaviour: currentBalance > 0 ? "Has outstanding balance — follow up for payment" : "Regular payer",
        favouriteProducts: totalOrders > 0 ? "Based on order history" : "No orders yet",
        riskLevel,
        suggestedFollowUp: currentBalance > 0 ? "Send payment reminder" : totalOrders >= 5 ? "Thank for loyalty" : "Welcome and encourage first order",
      };
    }
  }
}
