/**
 * Centralized Logging Utility for Udhaar Wise
 */
const logger = {
  info: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[INFO] ${timestamp}: ${message}`, Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '');
  },
  warn: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(`[WARN] ${timestamp}: ${message}`, Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '');
  },
  error: (message, error = null, meta = {}) => {
    const timestamp = new Date().toISOString();
    const errorDetails = error ? { message: error.message, stack: error.stack } : null;
    console.error(
      `[ERROR] ${timestamp}: ${message}`,
      JSON.stringify({ error: errorDetails, ...meta }, null, 2)
    );
  }
};

export default logger;
