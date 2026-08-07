import * as paymentClaimsService from "../services/paymentClaimsService.js";
import * as dashboardService from "../services/dashboardService.js";

export async function createPayment(req, res) {
  try {
    const shopkeeperId = req.user.id;
    const { customer_id, amount, payment_mode, raw_message } = req.body;
    if (!customer_id || !amount) return res.status(400).json({ success: false, message: 'customer_id and amount required' });

    const result = await paymentClaimsService.recordDirectPayment(shopkeeperId, customer_id, amount, payment_mode || 'cash', raw_message || null);

    // Refresh dashboard metrics (simple overview fetch)
    const overview = await dashboardService.getOverview(shopkeeperId);

    return res.status(200).json({ success: true, allocations: result.allocations || [], overview });
  } catch (err) {
    console.error('[Payments] createPayment err:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export default { createPayment };
