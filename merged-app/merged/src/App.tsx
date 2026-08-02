import { Routes, Route } from "react-router-dom";

import Landing from "./app/Landing";
import Auth from "./Auth";
import ConnectWhatsApp from "./ConnectWhatsApp";

import DashboardPage from "./routes/dashboard";
import OrdersPage from "./routes/orders";
import CustomersPage from "./routes/customers";
import FundingPage from "./routes/funding";
import SettingsPage from "./routes/settings/index";
import PremiumPage from "./routes/settings/premium";
import NotFoundPage from "./routes/not-found";

export default function App() {
  return (
    <Routes>
      {/* Landing / auth / WhatsApp linking flow */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Auth initialTab="login" />} />
      <Route path="/signup" element={<Auth initialTab="signup" />} />
      <Route path="/whatsapp" element={<ConnectWhatsApp />} />

      {/* Dashboard (mounted after WhatsApp linking) */}
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/dashboard/orders" element={<OrdersPage />} />
      <Route path="/dashboard/customers" element={<CustomersPage />} />
      <Route path="/dashboard/funding" element={<FundingPage />} />
      <Route path="/dashboard/settings" element={<SettingsPage />} />
      <Route path="/dashboard/settings/premium" element={<PremiumPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
