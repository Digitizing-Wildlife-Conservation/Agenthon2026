/**
 * Matatu Route Intelligence Agent — Configuration
 * Centralizes all environment variables and defaults.
 */
import 'dotenv/config';

const config = {
  // ─── Server ───
  port: parseInt(process.env.PORT, 10) || 3000,
  env: process.env.NODE_ENV || 'development',

  // ─── Africa's Talking ───
  at: {
    username: process.env.AT_USERNAME || 'sandbox',
    apiKey: process.env.AT_API_KEY,
    shortcode: process.env.AT_SHORTCODE || '20880',
  },

  // ─── Google Cloud / Vertex AI ───
  gcp: {
    projectId: process.env.GOOGLE_PROJECT_ID,
    location: process.env.GOOGLE_LOCATION || 'us-central1',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
  },

  // ─── Supabase ───
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // ─── SMS Constraints ───
  sms: {
    maxLength: 160,
    reportCooldownMs: 5 * 60 * 1000, // 5 min between reports from same number
  },
};

/**
 * Validates that all critical environment variables are present.
 * Logs warnings but does not crash the server in development.
 */
export function validateConfig() {
  const required = [
    ['AT_API_KEY', config.at.apiKey],
    ['GOOGLE_PROJECT_ID', config.gcp.projectId],
    ['SUPABASE_URL', config.supabase.url],
    ['SUPABASE_ANON_KEY', config.supabase.anonKey],
  ];

  const missing = required.filter(([, val]) => !val || val.includes('your_')).map(([name]) => name);

  if (missing.length > 0) {
    console.warn(
      `\n⚠️  WARNING: Missing or placeholder environment variables: ${missing.join(', ')}\n` +
      `Some features (SMS, AI, Database) will be disabled or fail.\n`
    );
  }
}

export default config;
