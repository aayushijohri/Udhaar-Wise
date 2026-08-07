import dotenv from 'dotenv';
import path from 'path';
import logger from '../utils/logger.js';

// Load environment variables from .env file
// override:true ensures .env values always win over stale system environment variables
dotenv.config({ override: true });

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID'
];

// Check for missing environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  logger.warn(`Missing environment variables: ${missingVars.join(', ')}. Some features may not work as expected.`);
}

// Check for placeholder/unconfigured values
const isPlaceholder = (val) => !val || val.includes('placeholder') || val.includes('your-');
const hasPlaceholders = requiredEnvVars.some(varName => isPlaceholder(process.env[varName]));

if (hasPlaceholders) {
  logger.warn('Running with placeholder environment variables. Ensure real credentials are provided for actual integration testing.');
}

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:5173', 'http://localhost:3000']
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    isPlaceholder: isPlaceholder(process.env.SUPABASE_URL) || isPlaceholder(process.env.SUPABASE_ANON_KEY)
  },
  whatsapp: {
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v19.0',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'udhaar_wise_webhook_secret_verification_token',
    isPlaceholder: isPlaceholder(process.env.WHATSAPP_ACCESS_TOKEN) || isPlaceholder(process.env.WHATSAPP_PHONE_NUMBER_ID)
  }
};

export default config;
