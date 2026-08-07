import { GoogleGenAI } from "@google/genai";
import { createWorker } from "tesseract.js";
import { groq } from "../config/groq.js";
export { groq };

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// gemini-flash-latest = Gemini Flash (latest stable) — confirmed working with current AQ. API keys
export const GEMINI_MODEL = "gemini-flash-latest";
export const GROQ_TEXT_MODEL = "llama-3.3-70b-versatile";

const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 1500;

export const INTENTS = {
  NEW_ORDER: "NEW_ORDER",
  PAYMENT: "PAYMENT",
  INVENTORY_ADD: "INVENTORY_ADD",
  INVENTORY_REMOVE: "INVENTORY_REMOVE",
  INVENTORY_UPDATE: "INVENTORY_UPDATE",
  ORDER_STATUS: "ORDER_STATUS",
  CUSTOMER_QUERY: "CUSTOMER_QUERY",
  SET_PRICE: "SET_PRICE",
  GENERAL_MESSAGE: "GENERAL_MESSAGE",
};

export async function parseOwnerMessage(text) {
  const prompt = `You are a smart shop manager assistant parsing business commands and queries from a shopkeeper.
  Analyze this message and classify it into one of these actions:
  
  1. CREATE_ORDER: Owner enters an order for a customer.
     Example: "Customer Diya ordered 2 chocolate cakes. Son birthday next week. Likes eggless. Pays by UPI."
     Returns:
     {
       "action": "create_order",
       "customer_name": "Diya",
       "items": [{"product": "chocolate cakes", "quantity": 2}],
       "metadata": {
         "preferences": "Likes eggless",
         "special_events": "Son birthday next week",
         "preferred_payment_mode": "UPI"
       }
     }
     
  2. RECORD_PAYMENT: Owner reports a payment received from a customer.
     Example: "Customer Priya paid 500 cash" or "Rahul paid 300 UPI"
     Returns:
     {
       "action": "record_payment",
       "customer_name": "Priya",
       "amount": 500,
       "payment_mode": "cash"
     }
     
  3. RESTOCK: Owner restocking raw materials or finished products.
     Example: "Restock Flour 20kg" or "Add 5kg atta to raw material" or "Restock Chocolate Cake 10" or "Add Sugar 2kg"
     Returns:
     {
       "action": "restock",
       "product_name": "atta",
       "quantity": 5,
       "unit": "kg",
       "is_raw_material": true
     }
     Rule for RESTOCK: If the message mentions raw material, ingredient, flour, atta, sugar, butter, milk, eggs, cream, cocoa, chocolate, oil, set "is_raw_material": true.
     
  4. ADD_PRODUCT: Owner adds a new sellable product to sell.
     Example: "Add New Product Butterscotch Cake" or "Add product Red Velvet Cake"
     Returns:
     {
       "action": "add_product",
       "product_name": "Butterscotch Cake",
       "is_raw_material": false
     }
     Rule for ADD_PRODUCT: If owner explicitly mentions raw material or ingredients (flour, atta, sugar, butter, milk, eggs, cream, cocoa, chocolate, oil), output action "restock" with "is_raw_material": true instead!
     
  5. UPDATE_PRODUCT_PRICE: Owner changes the price of a product.
     Example: "Update Chocolate Cake Price 450"
     Returns:
     {
       "action": "update_product_price",
       "product_name": "Chocolate Cake",
       "price": 450
     }
     
  6. DELETE_PRODUCT: Owner deletes a product.
     Example: "Delete Brownie"
     Returns:
     {
       "action": "delete_product",
       "product_name": "Brownie"
     }
     
  7. GET_REPORT: Owner asking for reports, metrics or database queries.
     Examples:
     - "Monthly revenue" or "This month sales" -> "monthly_revenue"
     - "Weekly revenue" or "This week sales" or "Week sales" -> "weekly_revenue"
     - "Total sales" or "Lifetime sales" -> "total_sales"
     - "Today's sales" or "Today revenue" or "Today sales" -> "today_sales"
     - "Pending dues" or "Pending money" or "Outstanding" -> "pending_money"
     - "Who owes me" -> "who_owes_me"
     - "Best customer" or "Top customers" -> "top_customers"
     - "Top products" or "Best selling" -> "top_products"
     - "Inventory value" or "Stock value" -> "inventory_value"
     - "Low stock" or "Stock alert" -> "low_stock"
     - "Inactive customers" -> "inactive_customers"
     Returns:
     {
       "action": "get_report",
       "report_type": "monthly_revenue" (or "weekly_revenue", "total_sales", "today_sales", "pending_money", "who_owes_me", "top_customers", "top_products", "inventory_value", "low_stock", "inactive_customers")
     }
     
  8. GENERAL_MESSAGE: Any other conversational message.
  
  Rules:
  - If a customer is mentioned, extract "customer_name" clearly.
  - Return ONLY a valid JSON string matching the specified structure (no markdown, no wrap).
  
  Message: "${text}"`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });
    const raw = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
    console.log("[AI/Gemini] parseOwnerMessage handled by Gemini");
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[AI/Gemini] parseOwnerMessage Gemini failed:", err.message);
    try {
      const res = await groq.chat.completions.create({
        model: GROQ_TEXT_MODEL,
        messages: [{ role: "user", content: prompt }],
      });
      const raw = res.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
      console.log("[AI/Groq] parseOwnerMessage handled by Groq fallback");
      return JSON.parse(raw);
    } catch (gerr) {
      console.error("[AI/RuleParser] parseOwnerMessage Groq fallback failed:", gerr.message);
      return { action: "general" };
    }
  }
}


function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --------------------------------------------------------------------------
// Hindi/Hinglish normalizer — run before amount extraction
// Converts spoken Hindi payment phrases to parseable English
// --------------------------------------------------------------------------
function normalizeHindiPayment(text) {
  let t = text;

  // Devanagari digits → ASCII
  t = t.replace(/[०-९]/g, (d) => String(d.codePointAt(0) - '०'.codePointAt(0)));

  // Spoken Hindi number words → digits (handle "teen sau = 300", "ek hazaar = 1000" etc.)
  const HINDI_HUNDREDS = { "ek sau": 100, "do sau": 200, "teen sau": 300, "chaar sau": 400, "paanch sau": 500, "chhah sau": 600, "saat sau": 700, "aath sau": 800, "nau sau": 900 };
  const HINDI_THOUSANDS = { "ek hazaar": 1000, "do hazaar": 2000, "teen hazaar": 3000, "chaar hazaar": 4000, "paanch hazaar": 5000, "das hazaar": 10000 };

  for (const [word, num] of Object.entries({ ...HINDI_THOUSANDS, ...HINDI_HUNDREDS })) {
    const re = new RegExp(word, "gi");
    t = t.replace(re, String(num));
  }

  // Hindi currency words → "rs"
  t = t.replace(/रुपय[ेे]?|rupaye|rupiya|rupiye|rupaiye|रुपी|रुपये/gi, "rs");
  t = t.replace(/पेमेंट|payment/gi, "payment");
  t = t.replace(/done|हो\s*गया|kar\s*diya|kar\s*diye|de\s*diya|kiya|diye|kar\s+diye|bhej\s+diye|bheja/gi, "paid");

  // "payment 300 rs" / "payment done 300" / "300 rupaye"
  t = t.replace(/payment\s+(?:done\s+)?(\d+)/i, "$1 paid");
  t = t.replace(/payment\s+(?:of\s+)?(\d+)/i, "$1 paid");

  // Devanagari payment phrases → simple "<amount> paid"
  t = t.replace(/पेमेंट\s*(\d+)/g, "$1 paid");
  t = t.replace(/(\d+)\s*रुपये?/g, "$1 rs");

  // "bhaiya payment" – strip salutations before amount
  t = t.replace(/(?:bhaiya|bhai|ji|sir|madam)\s+/gi, "");

  return t;
}

// --------------------------------------------------------------------------
// Amount extractor (supports ₹, rs, rupees, Hindi variants, voice phrases)
// --------------------------------------------------------------------------
function extractAmount(rawText) {
  const text = normalizeHindiPayment(rawText);
  const patterns = [
    // ₹300 / Rs 300 / INR300
    /(?:₹|rs\.?|rupees?|inr)\s*(\d+(?:\.\d+)?)/i,
    // 300 rs / 300 rupees / 300₹
    /(\d+(?:\.\d+)?)\s*(?:₹|rs\.?|rupees?|inr)/i,
    // paid / received / transferred / diye 300
    /(?:paid|received|payment\s+of|transferred|diye|kiye|kiya)\s+(?:₹|rs\.?|rupees?)?\s*(\d+(?:\.\d+)?)/i,
    // 300 paid / 300 gpay / 300 upi
    /(\d+(?:\.\d+)?)\s+(?:paid|ka\s+payment|ka\s+paisa|gpay|paytm|upi|cash|neft)/i,
    // payment 300 (after normalization "payment" before number)
    /(?:payment|paisa)\s+(\d+(?:\.\d+)?)/i,
    // 300 done / 300 ho gaya
    /(\d+(?:\.\d+)?)\s+(?:done|ho\s*gaya|send\s*kar|bhej)/i,
    // leading bare number if payment keyword present in original
    /^\s*(\d+(?:\.\d+)?)\s*$/,
  ];

  const hasPaymentContext = /paid|payment|paytm|gpay|phonepe|upi|cash|transferred|rupay|rupee|rupiya|rupaye|rs|₹|kar\s+diye|bhej|diya/i.test(text);

  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match) {
      // Only use the bare-number pattern if there's a payment context word
      if (i === patterns.length - 1 && !hasPaymentContext) continue;
      return Number(match[1]);
    }
  }
  return null;
}

// --------------------------------------------------------------------------
// Payment mode extractor
// --------------------------------------------------------------------------
export function extractPaymentMode(text) {
  const lower = text.toLowerCase();
  if (/paytm/.test(lower)) return "paytm";
  if (/gpay|google\s*pay/.test(lower)) return "gpay";
  if (/phonepe|phone\s*pe/.test(lower)) return "phonepe";
  if (/upi/.test(lower)) return "upi";
  if (/neft|bank\s*transfer|transfer/.test(lower)) return "bank_transfer";
  if (/cash|nakit|nakad|nakit/.test(lower)) return "cash";
  return "cash";
}

// --------------------------------------------------------------------------
// Rule-based parser (fallback when AI unavailable)
// --------------------------------------------------------------------------
export function ruleBasedParse(text) {
  console.log("[AI/RuleParser] Using rule-based parser as fallback");
  const lowerText = text.toLowerCase();

  let intent = INTENTS.GENERAL_MESSAGE;

  const PAYMENT_KEYWORDS = [
    "paid", "payment", "paisa", "paytm", "gpay", "phonepe", "upi", "neft",
    "received", "transferred", "transfer", "diye", "kiye", "kiya", "kar diya",
    "de diya", "cash", "bhej diya", "money", "amount",
  ];
  const INVENTORY_BUY = ["bought", "purchase", "procured", "kharida", "liya stock", "aaya maal", "add", "added", "restock"];
  const INVENTORY_REMOVE = ["reduce", "deduct", "remove", "decrease", "decreased", "minus", "reduce stock", "sold out"];
  const NEW_ORDER_FILLERS = [
    "bhej", "de do", "dena", "chahiye", "order", "lo", "send", "deliver",
  ];

  const hasPaymentKeywords = PAYMENT_KEYWORDS.some((kw) => lowerText.includes(kw));
  const hasAmount = extractAmount(text) !== null;

  if (hasPaymentKeywords && hasAmount) {
    intent = INTENTS.PAYMENT;
  } else if (/where is my order|order status|track my order|kahan hai mera order|mera order kaha/i.test(lowerText)) {
    intent = INTENTS.CUSTOMER_QUERY;
  } else if (INVENTORY_REMOVE.some((kw) => lowerText.includes(kw))) {
    intent = INTENTS.INVENTORY_REMOVE;
  } else if (INVENTORY_BUY.some((kw) => lowerText.includes(kw))) {
    intent = INTENTS.INVENTORY_ADD;
  } else if (
    lowerText.includes("set price") ||
    lowerText.includes("price change") ||
    /set .+ price \d+/i.test(text)
  ) {
    intent = INTENTS.SET_PRICE;
  } else if (lowerText.includes("status") || /where is my order/i.test(text)) {
    intent = INTENTS.ORDER_STATUS;
  } else if (/\d+/.test(text) && /[a-zA-Z\u0900-\u097F]/.test(text)) {
    // Has digits + letters (or Hindi chars) → likely an order
    intent = INTENTS.NEW_ORDER;
  } else if (NEW_ORDER_FILLERS.some((kw) => lowerText.includes(kw))) {
    intent = INTENTS.NEW_ORDER;
  }

  // Item parsing — handles: "2 bread", "2kg atta", "1/2 kilo cake", "aadha kilo"
  const items = [];
  const orderPatterns = [
    /(\d+(?:\.\d+)?)\s*(?:x\s*)?(?:(kg|g|gm|gram|kilo|litr?e?|l|ml|pcs|pieces?|dozen))?\s+([a-zA-Z\u0900-\u097F][a-zA-Z\u0900-\u097F\s]*?)(?:\s+(?:de|do|bhej|dena|send|chahiye)|,|$)/gi,
    /(aadha|ek|do|teen|chaar|paanch)\s+(?:(kg|kilo|gram|gm))?\s*([a-zA-Z\u0900-\u097F][a-zA-Z\u0900-\u097F\s]+)/gi,
    /(\d+(?:\.\d+)?)\s*([a-zA-Z\u0900-\u097F][a-zA-Z\u0900-\u097F\s]*)/g,
  ];

  const HINGLISH_NUM = { aadha: 0.5, ek: 1, do: 2, teen: 3, chaar: 4, paanch: 5 };
  const STOP_WORDS = /^(rs|rupees|paid|for|at|please|bhaiya|ji|ok|haan|nahi|ka|ki|ke|se|hai|ho|to)$/i;

  for (const pattern of orderPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const rawQty = match[1];
      const qty = HINGLISH_NUM[rawQty?.toLowerCase()] ?? parseFloat(rawQty) ?? 1;
      const unit = match[2] || "";
      const product = (match[3] || "").trim().replace(/\s+(de|do|bhej|dena|send|chahiye)$/i, "").trim();
      if (qty > 0 && product.length > 1 && !STOP_WORDS.test(product) && !/^\d+$/.test(product)) {
        items.push({ product, quantity: qty, unit });
      }
    }
    if (items.length > 0) break;
  }

  const amount = extractAmount(text);

  return { intent, customer_name: null, items, amount, notes: text };
}

// --------------------------------------------------------------------------
// Gemini intent classification
// --------------------------------------------------------------------------
async function detectIntentWithGemini(text) {
  const prompt = `You are a smart retail AI for an Indian shopkeeper app (Udhaar Wise).
Classify the following short message into EXACTLY ONE intent from this list (return only the intent name, nothing else):

NEW_ORDER            - Customer placing an order (e.g. "Priya ordered 4 chocolate cakes", "2 kg atta chahiye")
PAYMENT              - A payment was made or received (e.g. "Riya paid 400 rs", "Received ₹500", "paid 300 gpay")
INVENTORY_ADD        - Add or restock inventory (e.g. "Add 20 biscuits", "Restock 5 kg flour")
INVENTORY_REMOVE     - Remove or reduce stock (e.g. "Reduce stock by 5", "Sold 3 packets")
INVENTORY_UPDATE     - Generic inventory update or adjustment
ORDER_STATUS         - Customer asking about order status (e.g. "Where is my order?", "Track my order")
CUSTOMER_QUERY       - Specific customer query (e.g. "Rahul's balance", "Payment history for Priya")
SET_PRICE            - Set or update product price (e.g. "Set chocolate cake price 450")
GENERAL_MESSAGE      - Anything else (greeting, complaint, unclear)

Support English, Hindi, and Hinglish. Examples and expected outputs:
"Riya paid 400 rs" -> PAYMENT
"Received ₹500" -> PAYMENT
"Priya ordered 4 chocolate cakes" -> NEW_ORDER
"Add 20 biscuits" -> INVENTORY_ADD
"Reduce stock by 5" -> INVENTORY_REMOVE
"Where is my order?" -> ORDER_STATUS

Message: ${text}

Return ONLY the intent name in UPPERCASE.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });
  const result = response.text.replace(/```/g, "").trim().toUpperCase();
  return Object.values(INTENTS).includes(result) ? result : INTENTS.GENERAL_MESSAGE;
}

async function detectIntentWithGroq(text) {
  const system = `You classify business messages for a small shop. Return ONLY ONE intent name from the following list (no punctuation): NEW_ORDER, PAYMENT, INVENTORY_ADD, INVENTORY_REMOVE, INVENTORY_UPDATE, ORDER_STATUS, CUSTOMER_QUERY, SET_PRICE, GENERAL_MESSAGE.`;
  const response = await groq.chat.completions.create({
    model: GROQ_TEXT_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `Message: ${text}` },
    ],
    temperature: 0,
    max_tokens: 20,
  });
  const result = response.choices[0].message.content.replace(/```/g, "").trim().toUpperCase();
  return Object.values(INTENTS).includes(result) ? result : INTENTS.GENERAL_MESSAGE;
}

// Detect if an error is a quota/billing error (don't retry)
function isQuotaError(error) {
  const msg = error?.message || "";
  return (
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    (error?.status === 429) ||
    (typeof error?.code === "number" && error.code === 429)
  );
}

async function detectIntent(text) {
  let geminiQuotaHit = false;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[AI] Intent detection attempt ${attempt + 1} with Gemini`);
      const result = await detectIntentWithGemini(text);
      console.log(`[AI/Gemini] detectIntent handled by Gemini → ${result}`);
      return result;
    } catch (error) {
      if (isQuotaError(error)) {
        console.warn(`[AI/Gemini] Gemini quota exhausted — skipping retries, falling back to Groq`);
        geminiQuotaHit = true;
        break;
      }
      console.error(`[AI/Gemini] Intent attempt ${attempt + 1} failed:`, error.message);
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS);
    }
  }
  try {
    console.log("[AI] Falling back to Groq for intent detection");
    const result = await detectIntentWithGroq(text);
    console.log(`[AI/Groq] detectIntent handled by Groq → ${result}`);
    return result;
  } catch (error) {
    console.error("[AI/Groq] Groq intent failed:", error.message);
  }
  const result = ruleBasedParse(text).intent;
  console.log(`[AI/RuleParser] detectIntent handled by Rule Parser → ${result}`);
  return result;
}

// --------------------------------------------------------------------------
// Order parser (Gemini + Groq fallback)
// --------------------------------------------------------------------------
async function parseOrderWithGemini(text) {
  const prompt = `You are an AI assistant for Indian shopkeepers. Extract customer orders from English, Hindi, or Hinglish.

Return ONLY valid JSON (no markdown, no explanation).

Format:
{
  "customer_name": null,
  "items": [
    { "product": "item name in English", "quantity": 1.5, "unit": "kg" }
  ],
  "amount": null,
  "delivery_date": "",
  "notes": ""
}

Rules:
- Always translate product names to English
- Support fractions: "aadha" = 0.5, "ek" = 1, "do" = 2, "teen" = 3
- Support units: kg, gm, g, litre, l, ml, pcs, dozen, piece
- "1/2 kg" or "500 gm" or "half kg" → quantity: 0.5, unit: "kg"
- "aadha kilo cake" → product: "cake", quantity: 0.5, unit: "kg"
- Amount only if explicitly stated (e.g. "5 cakes for ₹300" → amount: 300)
- If no amount, set amount to null

Message: ${text}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });
  const result = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(result);
  if (parsed.amount === 0) parsed.amount = null;
  return parsed;
}

async function parseOrderWithGroq(text) {
  const response = await groq.chat.completions.create({
    model: GROQ_TEXT_MODEL,
    messages: [
      {
        role: "system",
        content: `Extract order items from customer messages (English/Hindi/Hinglish). Return ONLY valid JSON:
{"customer_name":null,"items":[{"product":"english name","quantity":1,"unit":"pcs"}],"amount":null,"notes":""}`,
      },
      { role: "user", content: text },
    ],
    temperature: 0,
  });
  const result = response.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(result);
  if (parsed.amount === 0) parsed.amount = null;
  return parsed;
}

export async function parseOrder(text) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[AI] parseOrder attempt ${attempt + 1}/${MAX_RETRIES + 1} with Gemini`);
      const result = await parseOrderWithGemini(text);
      console.log("[AI/Gemini] parseOrder handled by Gemini");
      return result;
    } catch (error) {
      if (isQuotaError(error)) {
        console.warn("[AI/Gemini] Gemini quota exhausted — skipping retries, falling back to Groq");
        break;
      }
      console.error(`[AI/Gemini] parseOrder attempt ${attempt + 1} failed:`, error.message);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      break;
    }
  }
  try {
    console.log("[AI] Attempting Groq parse fallback");
    const result = await parseOrderWithGroq(text);
    console.log("[AI/Groq] parseOrder handled by Groq fallback");
    return result;
  } catch (error) {
    console.error("[AI/Groq] Groq parse failed:", error.message);
  }
  console.log("[AI/RuleParser] parseOrder handled by Rule Parser fallback");
  const fallback = ruleBasedParse(text);
  return { customer_name: fallback.customer_name, items: fallback.items, amount: fallback.amount, notes: fallback.notes };
}

// --------------------------------------------------------------------------
// Image analysis via OCR -> Groq -> Gemini fallback
// --------------------------------------------------------------------------

async function runOcr(base64Data) {
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const worker = await createWorker("eng");
    try {
      const { data } = await worker.recognize(buffer);
      const text = (data?.text || "").trim();
      return text;
    } finally {
      await worker.terminate();
    }
  } catch (err) {
    console.warn("[AI/OCR] OCR failed:", err.message);
    return "";
  }
}

async function parseOcrWithGroq(ocrText, caption = "") {
  const prompt = `You are parsing OCR text from a retail image. Determine the probable intent and return ONLY valid JSON.

If a caption was provided with the image, use the caption together with the OCR text. Do not summarize or invent extra information.

Possible types:
- payment
- product
- order
- receipt
- unknown

If the image is a payment receipt or screenshot, return these payment fields:
{
  "type": "payment",
  "amount": 500,
  "currency": "INR",
  "payment_app": "paytm",
  "payment_mode": "paytm",
  "receiver": "Merchant or account receiving payment",
  "sender": "Payer/customer name",
  "transaction_id": "TXN123456",
  "date": "2026-08-07",
  "time": "14:35",
  "status": "success|pending|failed|unknown",
  "customer_name": "Ram",
  "product": null,
  "summary": "",
  "confidence": "high|medium|low"
}

If the caption contains a customer name and OCR does not, use the caption. If OCR contains customer details and caption does not, use OCR. If both contain customer names and they conflict, include customer_name based on the most explicit result and set "customer_conflict": true.

If the image is not a payment, include payment_app, receiver, sender, transaction_id, date, time, status and customer_name as null.
Do not summarize OCR output for payment images. Return valid JSON only, without markdown or explanation.

Caption:
${caption}

OCR text:
${ocrText}`;

  const response = await groq.chat.completions.create({
    model: GROQ_TEXT_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    max_tokens: 320,
  });
  const raw = response.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(raw);
}

/**
 * Analyse a WhatsApp image to extract payment amount, identify products, or understand order/receipt text.
 * @param {string} base64Data - base64-encoded image bytes
 * @param {string} mimeType - e.g. "image/jpeg"
 * @returns {{ type: 'payment'|'product'|'order'|'receipt'|'unknown', amount?: number, product?: string|null, summary?: string, confidence: string }}
 */
export async function analyseImage(base64Data, mimeType = "image/jpeg", caption = "") {
  const prompt = `You are analyzing a WhatsApp image sent in a retail chat.

If a caption was provided with the image, use the caption together with the OCR text. Do not invent extra details.

Caption:
${caption}

Determine if this image is:
1. A payment receipt/screenshot (Paytm, GPay, PhonePe, bank transfer, etc.)
2. A product photo or menu image
3. A handwritten or typed order note
4. An invoice or receipt

Return ONLY valid JSON (no markdown):
{
  "type": "payment" | "product" | "order" | "receipt" | "unknown",
  "amount": 500,
  "currency": "INR",
  "payment_app": "paytm",
  "payment_mode": "gpay",
  "receiver": "Merchant or receiver name",
  "sender": "Payer name",
  "transaction_id": "TXN123456",
  "date": "2026-08-07",
  "time": "14:35",
  "status": "success|pending|failed|unknown",
  "customer_name": "Ram",
  "product": null,
  "summary": "Short English description that can be used as a chat message",
  "confidence": "high" | "medium" | "low"
}

If payment: extract the exact amount transferred, payment mode, and all available payment details. If product/order/receipt: return a short natural-language summary in English that can be used as a chat message. If unknown: set type to "unknown".`;

  try {
    const ocrText = await runOcr(base64Data);
    if (ocrText && ocrText.length >= 12) {
      try {
        const parsed = await parseOcrWithGroq(ocrText, caption);
        if (parsed && parsed.type && parsed.type !== "unknown") {
          console.log("[AI/OCR] analyseImage handled by OCR + Groq");
          return { ...parsed, confidence: parsed.confidence || "medium", ocr_text: ocrText, caption: caption || "" };
        }
      } catch (ocrErr) {
        console.warn("[AI/OCR] Groq parsing failed:", ocrErr.message);
      }
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64Data } },
          ],
        },
      ],
    });
    const raw = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
    console.log("[AI/Gemini] analyseImage handled by Gemini");
    const parsed = JSON.parse(raw);
    return { ...parsed, confidence: parsed.confidence || "low", ocr_text: ocrText || "", caption: caption || "" };
  } catch (err) {
    console.error("[AI/Gemini] Image analysis failed:", err.message);
    return { type: "unknown", confidence: "low", summary: "", ocr_text: "" };
  }
}

// --------------------------------------------------------------------------
// Payment amount parser
// --------------------------------------------------------------------------
export async function parsePayment(text) {
  const amount = extractAmount(text);
  const mode = extractPaymentMode(text);
  return { amount, payment_mode: mode };
}

// --------------------------------------------------------------------------
// Set-price parser (owner commands like "set chocolate cake price 450")
// --------------------------------------------------------------------------
export function parseSetPrice(text) {
  const match = text.match(/set\s+(.+?)\s+price\s+(\d+(?:\.\d+)?)/i);
  if (match) {
    return { product: match[1].trim(), price: Number(match[2]) };
  }
  return null;
}

export async function classifyMessage(text) {
  return detectIntent(text);
}

// --------------------------------------------------------------------------
// Customer intelligence — kept from original
// --------------------------------------------------------------------------
export async function generateCustomerMemory(customerData) {
  const { name, totalOrders, totalSpending, lastPurchaseDate, currentBalance } = customerData;
  const prompt = `Generate a brief customer memory summary for a shopkeeper's customer.
Customer: ${name}, Orders: ${totalOrders}, Spending: ₹${totalSpending}, Last purchase: ${lastPurchaseDate || "Never"}, Balance: ₹${currentBalance}.
Return ONLY 1-2 sentences in a friendly tone.`;

  try {
    const response = await ai.models.generateContent({ model: GEMINI_MODEL, contents: prompt });
    console.log("[AI/Gemini] generateCustomerMemory handled by Gemini");
    return response.text.replace(/```/g, "").trim();
  } catch {
    try {
      const res = await groq.chat.completions.create({ model: GROQ_TEXT_MODEL, messages: [{ role: "user", content: prompt }] });
      console.log("[AI/Groq] generateCustomerMemory handled by Groq fallback");
      return res.choices[0].message.content.replace(/```/g, "").trim();
    } catch {
      console.log("[AI/RuleParser] generateCustomerMemory using static fallback");
      if (totalOrders === 0) return `${name} is a new customer with no orders yet.`;
      return `${name} has placed ${totalOrders} orders and spent ₹${totalSpending}${currentBalance > 0 ? ` with ₹${currentBalance} outstanding` : ""}.`;
    }
  }
}

export function generateCustomerTimeline(orders) {
  if (!orders || orders.length === 0) return [];

  const events = [];

  for (const order of orders) {
    // Order event — show item names if available
    const items = order.order_items || [];
    const itemSummary = items.length > 0
      ? items.map((i) => {
          const name = i.inventory?.item_name || i.item_name || "Item";
          const qty = i.quantity ? ` ×${i.quantity}` : "";
          return name + qty;
        }).join(", ")
      : "Order";

    events.push({
      date: new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      title: itemSummary,
      amount: order.final_amount != null && Number(order.final_amount) > 0 ? `₹${Number(order.final_amount).toLocaleString("en-IN")}` : "—",
      status: order.order_status || "pending",
    });

    // Payment event — if order has been fully/partially paid
    if (order.paid_amount && Number(order.paid_amount) > 0) {
      events.push({
        date: new Date(order.updated_at || order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        title: `Payment received`,
        amount: `₹${Number(order.paid_amount).toLocaleString("en-IN")}`,
        status: order.payment_status === "fully_paid" ? "completed" : "partially_paid",
      });
    }
  }

  return events
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);
}

function buildLocalFundingFallback(overview) {
  const score = Number.isFinite(Number(overview.loan_eligibility_score)) ? Number(overview.loan_eligibility_score) : 50;
  const probability = score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low';
  const monthlyRevenue = Number.isFinite(Number(overview.monthly_revenue)) ? Number(overview.monthly_revenue) : 0;
  const totalRevenue = Number.isFinite(Number(overview.total_revenue)) ? Number(overview.total_revenue) : 0;
  const pending = Number.isFinite(Number(overview.pending_udhaar)) ? Number(overview.pending_udhaar) : 0;
  const repeatOrders = Number.isFinite(Number(overview.orders_this_month)) ? Number(overview.orders_this_month) : 0;

  const strengths = [];
  const weaknesses = [];
  if (monthlyRevenue >= 50000) strengths.push('Consistent monthly revenue');
  if (pending <= 10000) strengths.push('Low overdue balances');
  if ((overview.unpaid_orders ?? 0) <= 5) strengths.push('Good repayment behavior');
  if (pending > 20000) weaknesses.push('High outstanding dues');
  if ((overview.low_stock_items ?? 0) > 5) weaknesses.push('Multiple low-stock items');
  if (totalRevenue < 100000) weaknesses.push('Revenue still growing');

  const schemes = [
    {
      name: 'PM Mudra Loan - Shishu',
      category: 'Working capital',
      amount: totalRevenue ? `Up to ₹${Math.max(50000, Math.min(200000, Math.round(totalRevenue * 0.2)))}` : 'Up to ₹50,000',
      interest: '9-11% p.a.',
      reason: 'A small-ticket working capital credit line for traders and shopkeepers with stable sales.',
      minScore: 50,
      apply_link: 'https://www.mudra.org.in/',
    },
    {
      name: 'SIDBI Distributor Credit',
      category: 'Supply chain credit',
      amount: totalRevenue ? `Up to ₹${Math.max(60000, Math.min(180000, Math.round(totalRevenue * 0.18)))}` : 'Up to ₹60,000',
      interest: '10-12% p.a.',
      reason: 'A working capital solution for retailers with regular supplier purchases.',
      minScore: 55,
      apply_link: 'https://www.sidbi.in/',
    },
    {
      name: 'CGTMSE-Backed MSME Loan',
      category: 'Guarantee-backed credit',
      amount: totalRevenue ? `Up to ₹${Math.max(80000, Math.min(250000, Math.round(totalRevenue * 0.22)))}` : 'Up to ₹80,000',
      interest: '11-13% p.a.',
      reason: 'A government-guaranteed loan that helps small businesses access bank credit without collateral.',
      minScore: 60,
      apply_link: 'https://www.cgtmse.in/',
    },
  ];

  const peers = [
    {
      business: 'Shree Kirana Store',
      name: 'Shree Kirana Store',
      location: overview.location || 'your area',
      category: overview.business_category || 'Retail',
      similarity: 0.82,
      reason: 'Similar customer mix and inventory profile in your region.',
      phone: '919900112233',
    },
    {
      business: 'Asha General Traders',
      name: 'Asha General Traders',
      location: overview.location || 'your area',
      category: overview.business_category || 'Retail',
      similarity: 0.77,
      reason: 'High repeat purchase behavior and supplier relationships match your profile.',
      phone: '919900223344',
    },
    {
      business: 'Sunder Trading Co.',
      name: 'Sunder Trading Co.',
      location: overview.location || 'your area',
      category: overview.business_category || 'Retail',
      similarity: 0.71,
      reason: 'A peer business with a comparable revenue range and inventory cadence.',
      phone: '919900334455',
    },
  ];

  return {
    approval_probability: probability,
    approval_score: score,
    credit_summary: `Loan eligibility score ${score}/100. ${probability} chance of approval based on revenue, repayment reliability, and customer retention.`,
    business_strengths: strengths,
    weak_areas: weaknesses,
    next_best_action: weaknesses.length > 0 ? `Focus on ${weaknesses[0].toLowerCase()}.` : 'Keep collecting dues and reinforcing customer loyalty.',
    explain: 'Structured fallback insights based on available business metrics.',
    funding_overview: 'Recommended funding schemes and peer references for your current business profile.',
    schemes,
    peers,
  };
}

export async function generateFundingInsights(overview) {
  const prompt = `You are an AI assistant generating a concise AI Business Insights card for a small shop. Use the provided metrics (JSON) to produce a JSON object with these fields:
{
  "approval_probability": "low|medium|high",
  "approval_score": number,
  "credit_summary": "short English description",
  "business_strengths": ["strength1", "strength2"],
  "weak_areas": ["weak1", "weak2"],
  "next_best_action": "single sentence action",
  "explain": "short explanation used for recommendation",
  "funding_overview": "short funding overview",
  "schemes": [
    {
      "name": "scheme name",
      "category": "credit type",
      "amount": "Up to ₹...",
      "interest": "...",
      "reason": "Why this scheme matches the business",
      "minScore": number,
      "apply_link": "https://..."
    }
  ],
  "peers": [
    {
      "business": "peer name",
      "name": "peer name",
      "location": "city or region",
      "category": "business category",
      "similarity": number,
      "reason": "Why this peer is a match",
      "phone": "919..."
    }
  ]
}

Reply with ONLY valid JSON. Use these rules:
- Keep all fields concise and professional.
- Use no placeholder phrases like 'Not Provided' or 'Unknown'.
- If you cannot generate schemes or peers from the data, return empty arrays for those fields.

Use the following input JSON:
${JSON.stringify(overview)}
`;

  try {
    const response = await ai.models.generateContent({ model: GEMINI_MODEL, contents: prompt });
    const raw = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[AI] generateFundingInsights Gemini failed:', err.message);
    try {
      const res = await groq.chat.completions.create({ model: GROQ_TEXT_MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0 });
      const raw = res.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(raw);
    } catch (gerr) {
      console.error('[AI] generateFundingInsights fallback failed:', gerr.message);
      return buildLocalFundingFallback(overview);
    }
  }
}

export async function generateCustomerInsights(customerData) {
  const { name, totalOrders, totalSpending, currentBalance, ordersList = [] } = customerData;
  const ordersSummary = ordersList.map(o => ({
    date: o.created_at,
    total: o.final_amount,
    status: o.order_status,
    payment_status: o.payment_status,
    items: (o.order_items || []).map(i => `${i.inventory?.item_name || 'Item'} x${i.quantity}`).join(', ')
  }));

  const prompt = `Generate a customer intelligence profile for ${name}.
Core stats: Total Orders: ${totalOrders}, Total Spending: ₹${totalSpending}, Outstanding Balance: ₹${currentBalance}.
Order History Data: ${JSON.stringify(ordersSummary.slice(0, 15))}
  
Return ONLY a valid JSON object matching this structure:
{
  "favouriteProducts": "string (comma-separated list of top items they love)",
  "buyingFrequency": "string (estimate based on history)",
  "preferredTime": "string (common time of day or weekday)",
  "averageBill": "string (average spend amount)",
  "paymentBehaviour": "string (describes full/partial/late/on-time patterns)",
  "repeatPurchaseRate": "string (estimated loyalty/repurchase rate)",
  "predictedNextPurchase": "string (prediction of what/when they will order next)",
  "importantEvents": "string (festivals/occasions like festival sweets ordering or general occasions)",
  "recommendations": "string (1 actionable recommendation for the shopkeeper to boost retention or prompt payment)"
}`;

  try {
    const response = await ai.models.generateContent({ model: GEMINI_MODEL, contents: prompt });
    const raw = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
    console.log("[AI/Gemini] generateCustomerInsights handled by Gemini");
    return JSON.parse(raw);
  } catch {
    try {
      const res = await groq.chat.completions.create({ model: GROQ_TEXT_MODEL, messages: [{ role: "user", content: prompt }] });
      const raw = res.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
      console.log("[AI/Groq] generateCustomerInsights handled by Groq fallback");
      return JSON.parse(raw);
    } catch {
      console.log("[AI/RuleParser] generateCustomerInsights using static fallback");
      const itemsMap = {};
      let partialPayments = 0;
      for (const o of ordersList) {
        if (o.payment_status === "partially_paid") partialPayments++;
        for (const i of o.order_items || []) {
          const item_name = i.inventory?.item_name || "Product";
          itemsMap[item_name] = (itemsMap[item_name] || 0) + i.quantity;
        }
      }

      const sorted = Object.entries(itemsMap).sort((a, b) => b[1] - a[1]);
      const favouriteProducts = sorted.slice(0, 3).map(x => x[0]).join(", ") || "None";
      const averageBill = totalOrders > 0 ? Math.round(totalSpending / totalOrders) : 0;

      let paymentBehaviour = "Prompt full settlements";
      if (currentBalance > 2000) {
        paymentBehaviour = "Late payment (Awaits reminder)";
      } else if (partialPayments > 0) {
        paymentBehaviour = "Regular partial installments";
      }

      return {
        favouriteProducts,
        buyingFrequency: totalOrders > 8 ? "Weekly regular" : totalOrders > 2 ? "Monthly recurring" : "Occasional buyer",
        preferredTime: "Late afternoon (4 PM - 7 PM)",
        averageBill: `₹${averageBill}`,
        paymentBehaviour,
        repeatPurchaseRate: totalOrders > 1 ? "85%" : "0%",
        predictedNextPurchase: favouriteProducts !== "None" ? `${favouriteProducts.split(",")[0]}` : "Pending next order",
        importantEvents: "Festive sweets & family occasions",
        recommendations: currentBalance > 0
          ? `Send payment reminder via WhatsApp for ₹${currentBalance}.`
          : "Offer loyalty reward points or early order access."
      };
    }
  }
}

export async function generatePersonalizedPromo(customerName, memory) {
  const prompt = `Generate a warm, friendly, highly personalized marketing/promotional message for customer ${customerName} to be sent via WhatsApp.
  Use these details:
  - Favorite Products: ${memory?.favorite_products || "N/A"}
  - Special Events/Birthdays: ${memory?.special_events || "N/A"}
  - Preferences: ${memory?.preferences || "N/A"}
  - Buying Frequency: ${memory?.buy_frequency || "N/A"}

  Rules:
  1. Keep it short, engaging, and under 120 words.
  2. Speak directly to details like birthdays or preferences.
  3. No placeholders, output raw ready-to-send text.`;

  try {
    const response = await ai.models.generateContent({ model: GEMINI_MODEL, contents: prompt });
    console.log("[AI/Gemini] generatePersonalizedPromo handled by Gemini");
    return response.text.trim();
  } catch {
    try {
      const res = await groq.chat.completions.create({
        model: GROQ_TEXT_MODEL,
        messages: [{ role: "user", content: prompt }]
      });
      console.log("[AI/Groq] generatePersonalizedPromo handled by Groq fallback");
      return res.choices[0].message.content.trim();
    } catch (err) {
      console.log("[AI/RuleParser] generatePersonalizedPromo using static fallback");
      return `Hi ${customerName}! We have some fresh batches of your favorites ready at our shop. Hope to serve you again soon!`;
    }
  }
}
