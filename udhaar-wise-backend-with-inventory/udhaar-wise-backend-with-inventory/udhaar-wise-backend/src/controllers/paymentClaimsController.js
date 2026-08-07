import * as paymentClaimsService from "../services/paymentClaimsService.js";
import whatsappService from "../services/whatsappService.js";
import logger from "../utils/logger.js";

// GET /api/payment-claims?status=pending
export async function listClaims(req, res) {
  try {
    const shopkeeperId = req.user.id;
    const { status } = req.query;
    const claims = await paymentClaimsService.listPaymentClaims(shopkeeperId, { status });
    return res.json({ success: true, data: claims });
  } catch (err) {
    logger.error("listClaims error: " + err.message);
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

// POST /api/payment-claims/:id/approve
export async function approveClaim(req, res) {
  try {
    const shopkeeperId = req.user.id;
    const { id } = req.params;
    const result = await paymentClaimsService.approvePaymentClaim(shopkeeperId, id);

    const { claim, allocations, unallocated } = result;
    const customerPhone = claim.customers?.phone_number;
    const customerName = claim.customers?.name || "Customer";

    // Send WhatsApp confirmation to customer if phone available
    if (customerPhone) {
      const allFullyPaid = allocations.every((a) => a.fully_paid) && unallocated === 0;

      // Build human-readable allocation lines using item names
      const allocationLines = allocations
        .map((a) => {
          // Use item summary if available (from enriched allocations)
          const itemDisplay = a.items_summary || a.order_number;
          const applied = `₹${Number(a.applied).toLocaleString("en-IN")}`;
          const remaining = a.fully_paid ? null : `₹${Number(a.total - a.new_paid).toLocaleString("en-IN")} remaining`;
          const statusIcon = a.fully_paid ? "✅ Cleared" : "⏳ Partial";
          return `📦 ${itemDisplay}\n   ${applied} applied ${statusIcon}${
            remaining ? `\n   ${remaining}` : ""
          }`;
        })
        .join("\n\n");

      const header = `✅ *₹${Number(claim.amount).toLocaleString("en-IN")} payment verified!*`;
      const footer = allFullyPaid
        ? `\n\n🎉 All orders cleared! Thank you, ${customerName}!`
        : unallocated > 0
        ? `\n\n(₹${Number(unallocated).toLocaleString("en-IN")} will carry forward to new orders)`
        : "";

      const msg = `${header}\n\n${allocationLines}${footer}`;

      whatsappService.sendTextMessage(customerPhone, msg).catch((e) =>
        logger.error("Failed to send payment confirmation to customer: " + e.message)
      );
    }

    return res.json({ success: true, data: result });
  } catch (err) {
    logger.error("approveClaim error: " + err.message);
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

// POST /api/payment-claims/:id/reject
export async function rejectClaim(req, res) {
  try {
    const shopkeeperId = req.user.id;
    const { id } = req.params;
    const claim = await paymentClaimsService.rejectPaymentClaim(shopkeeperId, id);

    // Optionally notify customer
    const customerPhone = claim.customers?.phone_number;
    if (customerPhone) {
      whatsappService.sendTextMessage(
        customerPhone,
        `❌ Your payment claim of ₹${claim.amount} could not be verified. Please contact the shop directly.`
      ).catch((e) => logger.error("Failed to send rejection to customer: " + e.message));
    }

    return res.json({ success: true, data: claim });
  } catch (err) {
    logger.error("rejectClaim error: " + err.message);
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
}
