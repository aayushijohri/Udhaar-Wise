import { createClient } from '@supabase/supabase-js';
import config from './env.js';
import logger from '../utils/logger.js';


// Initialize Supabase Client
const supabaseUrl = config.supabase.url;
const supabaseKey = config.supabase.anonKey;
const serviceKey = config.supabase.serviceRoleKey;

let supabase = null;
let supabaseAdmin = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
    logger.info('Supabase client initialized successfully.');
  } catch (error) {
    logger.error('Failed to initialize Supabase client client.', error);
  }
} else {
  logger.warn('Supabase URL or Key is missing. Supabase operations will fail.');
}

if (supabaseUrl && serviceKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    logger.info('Supabase admin client initialized successfully.');
  } catch (error) {
    logger.error('Failed to initialize Supabase admin client.', error);
  }
} else {
  logger.warn('Supabase service role key is missing. Admin operations will fail.');
}

/**
 * Verifies connection by executing a basic select call.
 * Handles failure gracefully so that the application or tests do not crash.
 */
export async function verifySupabaseConnection() {
  if (config.supabase.isPlaceholder) {
    logger.warn('Supabase verification skipped because of placeholders credentials. Set correct credentials in .env.');
    return { ok: false, reason: 'unconfigured_credentials' };
  }

  if (!supabase) {
    logger.error('Supabase client is not initialized.');
    return { ok: false, reason: 'not_initialized' };
  }

  try {
    // Attempting a simple query. Since it might compile code/query before tables exist,
    // we query auth or a simple select 1. In Supabase, supabase.auth.getSession() or a direct light SQL query can work.
    // The most universal connection check is fetching the API version or performing a basic query.
    // However, JS Client API doesn't support raw SQL query easily without RPC, so we can fetch users with a limit of 1
    // or call something that doesn't trigger table-missing error if possible, e.g. selecting from an auth configuration.
    // Actually, calling a table we expect to exist (e.g. 'users') is standard:
    const { data, error } = await supabase.from('users').select('id').limit(1);
    
    if (error) {
      // If table doesn't exist yet, but we got a response from the router (e.g. schema or auth error of access denied, etc.)
      // it means connection is alive.
      // If we get an error stating the table 'users' does not exist, the connection works (we reached Supabase API) but the schema hasn't been set yet.
      if (error.code === 'P0001' || error.message.includes('relation "users" does not exist') || error.message.includes('does not exist')) {
        logger.info('Supabase connection verified successfully (API reachable, table "users" does not exist yet).');
        return { ok: true, reason: 'database_reachable_schema_pending' };
      }
      
      // If it is an auth error, connection still works
      if (error.status === 401 || error.status === 403) {
        logger.info('Supabase connection verified (API reachable, auth rejection/invalid credentials).');
        return { ok: true, reason: 'database_reachable_auth_error' };
      }

      throw error;
    }
    
    logger.info('Supabase connection verified successfully. Database is reachable and schema is ready.');
    return { ok: true, reason: 'success' };
  } catch (err) {
    logger.error('Supabase connection verification failed.', err);
    return { ok: false, reason: 'connection_error', error: err.message };
  }
}

export { supabase, supabaseAdmin };
