// Attendly Telemetry & Analytics Configuration (PostHog Cloud)
// 100% Free Tier (1,000,000 events/month)
// Sign up at https://posthog.com, copy your Project API Key and paste below.

export const ANALYTICS_CONFIG = {
  // PostHog Project API Key (starts with phc_...)
  // Sourced strictly from environment variable (empty string disables remote telemetry)
  POSTHOG_API_KEY: process.env.EXPO_PUBLIC_POSTHOG_API_KEY || '',

  // PostHog Host ('https://us.i.posthog.com' or 'https://eu.i.posthog.com')
  POSTHOG_HOST:
    process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',

  // Enable live colored emoji logs in terminal/Metro during development only
  ENABLE_DEBUG_LOGGING: typeof __DEV__ !== 'undefined' ? __DEV__ : false,

  // Maximum events to buffer offline before trimming (FIFO cap)
  MAX_OFFLINE_QUEUE_SIZE: 100,

  // Batch flush interval in milliseconds
  FLUSH_INTERVAL_MS: 30000, // 30 seconds
};
