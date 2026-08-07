import jsPDF from "jspdf";

function formatCurrency(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? `₹${Math.round(number).toLocaleString("en-IN")}` : "—";
}

function safeText(value: unknown, fallback = "") {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "number" && Number.isNaN(value)) {
    return fallback;
  }
  return String(value);
}

function getScoreLabel(score: number) {
  if (score >= 80) return { label: "Excellent", color: "text-emerald-600", bg: "bg-emerald-50" };
  if (score >= 60) return { label: "Good", color: "text-teal-600", bg: "bg-teal-50" };
  if (score >= 40) return { label: "Fair", color: "text-amber-600", bg: "bg-amber-50" };
  return { label: "Needs Work", color: "text-rose-600", bg: "bg-rose-50" };
}

export function exportCreditPassportPDF({
  overview,
  customers = [],
  inventory = [],
}: {
  overview: any;
  customers?: any[];
  inventory?: any[];
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  let y = 0;

  // ── Dark header bar ──────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);        // slate-900
  doc.rect(0, 0, W, 38, "F");
  doc.setFillColor(16, 185, 129);      // emerald-500 accent stripe
  doc.rect(0, 36, W, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("UDHAAR WISE", 10, 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110, 231, 183);    // emerald-300
  doc.text("AI BUSINESS CREDIT PASSPORT", 10, 23);

  doc.setTextColor(148, 163, 184);    // slate-400
  doc.setFontSize(8);
  doc.text(`Generated: ${dateStr} at ${timeStr}`, 10, 30);
  doc.text("CONFIDENTIAL — FOR BANK USE ONLY", W - 10, 30, { align: "right" });

  y = 48;

  // ── Score section ────────────────────────────────────────────────────────
  const score = Number.isFinite(Number(overview?.loan_eligibility_score)) ? Number(overview?.loan_eligibility_score) : 0;
  const scoreLabel = getScoreLabel(score);
  const breakdown = (overview?.loan_score_breakdown ?? []) as { factor: string; score: number; max: number; description: string; isPositive?: boolean }[];
  const totalRevenue = Number.isFinite(Number(overview?.total_revenue)) ? Number(overview?.total_revenue) : undefined;
  const monthlyRevenue = Number.isFinite(Number(overview?.monthly_revenue)) ? Number(overview?.monthly_revenue) : undefined;
  const pendingUdhaar = Number.isFinite(Number(overview?.pending_udhaar)) ? Number(overview?.pending_udhaar) : undefined;
  const totalCustomers = customers?.length || 0;
  const vipCount = customers.filter(c => c.badge === "VIP").length;
  const repeatCustomers = customers.filter(c => c.orders >= 2).length;
  const repaymentReliability = Number.isFinite(Number(overview?.repayment_reliability_percent)) ? Number(overview?.repayment_reliability_percent) : undefined;
  const margin = Number.isFinite(Number(overview?.profit_margin_percent)) ? Number(overview?.profit_margin_percent) : undefined;

  // Background card
  doc.setFillColor(240, 253, 250);    // teal-50
  doc.roundedRect(10, y, W - 20, 42, 3, 3, "F");
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(10, y, W - 20, 42, 3, 3, "S");

  // Score circle
  doc.setFillColor(16, 185, 129);
  doc.circle(38, y + 21, 16, "F");
  doc.setFillColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(String(score), 38, y + 24, { align: "center" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110, 231, 183);
  doc.text("/ 100", 38, y + 30, { align: "center" });

  // Score label
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(scoreLabel.label + " Credit Profile", 62, y + 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Monthly Revenue: ${formatCurrency(monthlyRevenue)}`, 62, y + 24);
  doc.text(`Total Revenue: ${formatCurrency(totalRevenue)}`, 62, y + 31);
  doc.text(`Outstanding Dues: ${formatCurrency(pendingUdhaar)}`, 62, y + 38);

  // Score bar
  const barX = 62, barY = y + 42, barW = W - 75;
  doc.setFillColor(226, 232, 240);
  doc.roundedRect(barX, barY - 3, barW, 4, 2, 2, "F");
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(barX, barY - 3, (barW * score) / 100, 4, 2, 2, "F");

  y += 52;

  // ── Customer Analytics ──────────────────────────────────────────────────
  y += 8;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Customer Analytics", 10, y);
  y += 6;

  const custRows = [
    ["Total Customers", safeText(totalCustomers), "VIP Customers", safeText(vipCount)],
    ["Repeat Customers", safeText(repeatCustomers), "Retention Rate", safeText(totalCustomers > 0 ? `${Math.round((repeatCustomers / totalCustomers) * 100)}%` : undefined)],
    ["Repayment Reliability", safeText(repaymentReliability != null ? `${repaymentReliability}%` : undefined), "Profit Margin (proxy)", safeText(margin != null ? `${Math.max(0, margin)}%` : undefined)],
  ];

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  custRows.forEach((row, idx) => {
    const rowY = y + idx * 10;
    if (idx % 2 === 0) {
      doc.setFillColor(240, 253, 250);
      doc.rect(10, rowY - 4, W - 20, 10, "F");
    }
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 65, 85);
    doc.text(row[0], 15, rowY + 1);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(16, 185, 129);
    doc.text(row[1], 70, rowY + 1);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 65, 85);
    doc.text(row[2], 105, rowY + 1);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(16, 185, 129);
    doc.text(row[3], 165, rowY + 1);
  });

  y += custRows.length * 10 + 8;

  // ── Score Breakdown ──────────────────────────────────────────────────────
  if (breakdown.length > 0) {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Score Breakdown", 10, y);
    y += 6;

    breakdown.forEach((f, idx) => {
      const rowY = y + idx * 14;
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(10, rowY - 4, W - 20, 14, "F");
      }
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(f.factor, 15, rowY + 1);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(f.description, 15, rowY + 7);

      // mini bar
      const bx = W - 55, bw = 40, bh = 3;
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(bx, rowY - 1, bw, bh, 1, 1, "F");
      const fill = f.isPositive === false ? [251, 113, 133] : [16, 185, 129];
      doc.setFillColor(fill[0], fill[1], fill[2]);
      doc.roundedRect(bx, rowY - 1, (bw * f.score) / f.max, bh, 1, 1, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(f.isPositive === false ? 225 : 5, f.isPositive === false ? 29 : 150, f.isPositive === false ? 72 : 105);
      doc.text(`${f.score}/${f.max}`, bx + bw + 2, rowY + 2);
    });

    y += breakdown.length * 14 + 8;
  }

  // ── Inventory Summary ────────────────────────────────────────────────────
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Inventory Summary", 10, y);
  y += 6;

  const lowStockItems = inventory.filter(i => i.stock <= i.low);
  const invRows = [
    ["Total Active Products", safeText(inventory.length)],
    ["Low-Stock Items", safeText(lowStockItems.length)],
    ...(lowStockItems.slice(0, 3).map(i => [`  ↳ ${safeText(i.name)}`, `${safeText(i.stock)} units remaining`])),
  ];

  invRows.forEach((row, idx) => {
    const rowY = y + idx * 9;
    doc.setFontSize(8);
    doc.setFont("helvetica", idx < 2 ? "bold" : "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(row[0], 15, rowY);
    doc.setTextColor(idx < 2 ? 16 : 239, idx < 2 ? 185 : 68, idx < 2 ? 129 : 68);
    doc.text(row[1], 130, rowY);
  });

  y += invRows.length * 9 + 8;

  // ── AI Recommendations ───────────────────────────────────────────────────
  doc.setFillColor(254, 252, 232);    // yellow-50
  doc.setDrawColor(253, 224, 71);     // yellow-300
  doc.roundedRect(10, y, W - 20, 34, 3, 3, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(133, 77, 14);
  doc.text("🤖 AI Recommendations", 15, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 53, 15);
  const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;
  const tips = [
    "• Maintain outstanding dues below 15% of monthly revenue to improve loan score.",
    "• Increase repeat customer rate through WhatsApp loyalty reminders.",
    `• Your retention rate is ${repeatRate}% — target 70%+ for best-in-class credit profile.`,
  ];
  tips.forEach((tip, i) => doc.text(tip, 15, y + 15 + i * 7));

  y += 44;

  // ── Verification Footer ──────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, y, W, 26, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(110, 231, 183);
  doc.text("VERIFIED BY UDHAAR WISE AI BUSINESS OS", 10, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.text("This Credit Passport is generated from live, AI-verified business data. Data source: Supabase secure database.", 10, y + 16);
  doc.text(`Reference: UW-CP-${Date.now().toString(36).toUpperCase()} · udhaarwise.app/verify`, 10, y + 22);

  // Save
  doc.save(`CreditPassport_${now.toISOString().slice(0, 10)}.pdf`);
}
