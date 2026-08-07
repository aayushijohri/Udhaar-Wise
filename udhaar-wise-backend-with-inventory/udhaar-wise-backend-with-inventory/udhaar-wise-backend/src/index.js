import express from "express";
import cors from "cors";
import morgan from "morgan";

import config from "./config/env.js";
import logger from "./utils/logger.js";

import whatsappRoutes from "./routes/whatsappRoutes.js";
import authRoutes from "./routes/authRoutes.js";

import { supabase } from "./config/supabase.js";
import { verifySupabaseConnection } from "./config/supabase.js";

import aiRoutes from "./routes/aiRoutes.js";
import voiceRoutes from "./routes/voiceRoutes.js";

// Newly integrated modules (see Integration Report)
import ordersRoutes from "./routes/ordersRoutes.js";
import customersRoutes from "./routes/customersRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import premiumRoutes from "./routes/premiumRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import paymentClaimsRoutes from "./routes/paymentClaimsRoutes.js";
import paymentsRoutes from "./routes/paymentsRoutes.js";


const app = express();

// Request logging middleware
app.use(morgan("dev"));

// Configure CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, mobile apps, etc.)
      if (!origin) return callback(null, true);

      const allowed = config.cors.allowedOrigins;
      const isAllowed =
        allowed.includes("*") || allowed.includes(origin);

      if (isAllowed) {
        return callback(null, true);
      } else {
        logger.warn(`Blocked by CORS: ${origin}`);
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma", "Expires"],
  })
);

// Prevent browser/CDN/proxy caching of all API endpoints
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
  next();
});

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get("/", (req, res) => {
  res.status(200).json({
    status: "healthy",
    message: "Udhaar Wise Backend API is up and running.",
    timestamp: new Date().toISOString(),
  });
});

// Diagnostics
app.get("/api/diagnostics", async (req, res) => {
  const dbStatus = await verifySupabaseConnection();

  res.status(200).json({
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
    services: {
      supabase: dbStatus,
      whatsapp: {
        isConfigured: !config.whatsapp.isPlaceholder,
        apiVersion: config.whatsapp.apiVersion,
        phoneNumberId: config.whatsapp.isPlaceholder
          ? "unconfigured"
          : config.whatsapp.phoneNumberId,
      },
    },
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/voice", voiceRoutes);

// Newly integrated modules (see Integration Report)
app.use("/api/orders", ordersRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/premium", premiumRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/payment-claims", paymentClaimsRoutes);
app.use("/api/payments", paymentsRoutes);



// Global Error Handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, err);

  const status = err.status || 500;

  res.status(status).json({
    error: {
      message:
        config.nodeEnv === "development"
          ? err.message
          : "Internal Server Error",
      status,
    },
  });
});

// Start Server
const PORT = config.port;

app.listen(PORT, async () => {
  logger.info(
    `Server started successfully on port ${PORT} in ${config.nodeEnv} mode.`
  );

  logger.info("Running startup database connection diagnostics...");
  await verifySupabaseConnection();
});

export default app;