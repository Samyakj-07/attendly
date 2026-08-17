// Attendly Telemetry & Analytics Configuration (PostHog Cloud)
// 100% Free Tier (1,000,000 events/month)
// Sign up at https://posthog.com, copy your Project API Key and paste below.

export const ANALYTICS_CONFIG = {
  // PostHog Project API Key (starts with phc_...)
  // Leave empty to run in local Console Debug Mode during development
  POSTHOG_API_KEY: 'phc_BC4ngpsvNeKGoY4NWKbmsYEXEGwe35BKEj84EGJ7qd5j',

  // PostHog Host ('https://us.i.posthog.com' or 'https://eu.i.posthog.com')
  POSTHOG_HOST: 'https://us.i.posthog.com',

  // Enable live colored emoji logs in terminal/Metro during development
  ENABLE_DEBUG_LOGGING: true,

  // Maximum events to buffer offline before trimming
  MAX_OFFLINE_QUEUE_SIZE: 150,

  // Batch flush interval in milliseconds
  FLUSH_INTERVAL_MS: 30000, // 30 seconds
};
