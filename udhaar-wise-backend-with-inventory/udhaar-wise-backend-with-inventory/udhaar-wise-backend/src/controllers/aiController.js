import * as aiService from "../services/aiService.js";
import * as dashboardService from "../services/dashboardService.js";

export async function parseOrder(req, res) {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text is required",
      });
    }

    console.log('[AI][STAGE1] Raw transcript received for parseOrder:', text);

    const order = await aiService.parseOrder(text);
    try {
      console.log('[AI][STAGE2] AI parser output for parseOrder:', JSON.stringify(order));
    } catch (e) {}

    // Backwards-compatible response: include parsed fields both inside `data` and at top-level
    const responseBody = { success: true, data: order, ...order };
    return res.status(200).json(responseBody);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
        success: false,
        message: error.message,
    });
  }
}

export async function getFundingInsights(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const shopkeeperId = req.user.id;
    const overview = await dashboardService.getOverview(shopkeeperId);
    const insights = await aiService.generateFundingInsights(overview);
    return res.status(200).json({ success: true, data: insights });
  } catch (error) {
    console.error('[AI] getFundingInsights error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function classify(req, res) {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Text is required' });
    const intent = await aiService.classifyMessage(text);
    const responseBody = { success: true, data: { intent }, intent };
    console.log('[AI][CLASSIFY] Response:', JSON.stringify(responseBody));
    return res.status(200).json(responseBody);
  } catch (err) {
    console.error('[AI] classify error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function query(req, res) {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Text is required' });
    const intent = await aiService.classifyMessage(text);
    // CUSTOMER_QUERY: fetch live customer data and return status/history
    if (intent === 'CUSTOMER_QUERY' || /order status|where is my order|payment history|outstanding/i.test(text)) {
      // Try to extract name via parseOrder heuristics
      const parsed = await aiService.parseOrder(text);
      const name = parsed.customer_name || null;
      if (!name) return res.status(200).json({ success: true, intent, message: 'Could not determine customer name from query', data: parsed });
      // Search customer by name
      const { data: cust } = await (await import('../config/supabase.js')).supabaseAdmin
        .from('customers').select('id, name, phone_number, current_balance').ilike('name', `%${name}%`).limit(1);
      const customer = (cust && cust[0]) || null;
      if (!customer) return res.status(200).json({ success: true, intent, message: 'Customer not found', name });
      // Fetch recent orders and transactions
      const { data: orders } = await (await import('../config/supabase.js')).supabaseAdmin
        .from('orders').select('id, order_number, final_amount, paid_amount, payment_status, order_status, created_at').eq('customer_id', customer.id).order('created_at',{ascending:false}).limit(10);
      const { data: txs } = await (await import('../config/supabase.js')).supabaseAdmin
        .from('transactions').select('id, type, amount, payment_method, description, created_at').eq('customer_id', customer.id).order('created_at',{ascending:false}).limit(10);
      // Generate a concise AI summary for owner
      const insights = await aiService.generateCustomerInsights({ name: customer.name, totalOrders: orders.length, totalSpending: orders.reduce((s,o)=>s+Number(o.final_amount||0),0), currentBalance: customer.current_balance || 0, ordersList: orders });
      return res.status(200).json({ success: true, intent, customer, orders, transactions: txs, ai_summary: insights });
    }

    // GENERAL_MESSAGE: forward to AI with business overview context
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const overview = await dashboardService.getOverview(req.user.id);
    const data = await aiService.generateFundingInsights(overview); // reuse funding insights generator for concise recommendations
    const answer = typeof data === 'object' && data !== null
      ? data.credit_summary || `Loan approval probability is ${data.approval_probability || 'medium'}.`
      : String(data);
    return res.status(200).json({ success: true, intent, answer, data });
  } catch (err) {
    console.error('[AI] query error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}