export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  // Public site address, linked from Telegram notifications.
  siteUrl: process.env.SITE_URL ?? 'http://localhost:5173',

  // Database connection is read directly by Prisma from DATABASE_URL (see
  // prisma/schema.prisma's datasource block) — not proxied through
  // ConfigService, since PrismaClient reads process.env itself at
  // construction time.

  jwt: {
    // Falls back to the dev default only when unset OR left blank — an
    // empty JWT_ACCESS_SECRET= in .env should not silently pass through,
    // since passport-jwt throws at boot if it receives an empty string.
    // ACCESS_TOKEN_KEY / REFRESH_TOKEN_KEY / *_TIME are the names actually
    // used in .env — without them the server silently signed tokens with the
    // public dev default, letting anyone forge an admin token.
    accessSecret:
      process.env.JWT_ACCESS_SECRET ||
      process.env.ACCESS_TOKEN_KEY ||
      'dev-access-secret-change-me',
    accessExpiresIn:
      process.env.JWT_ACCESS_EXPIRES_IN || process.env.ACCESS_TOKEN_TIME || '15m',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      process.env.REFRESH_TOKEN_KEY ||
      'dev-refresh-secret-change-me',
    refreshExpiresIn:
      process.env.JWT_REFRESH_EXPIRES_IN || process.env.REFRESH_TOKEN_TIME || '30d',
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    botUsername: process.env.TELEGRAM_BOT_USERNAME ?? '',
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID ?? '',
    enabled: (process.env.TELEGRAM_ENABLED ?? 'false') === 'true',
    linkTokenTtlMinutes: parseInt(process.env.TELEGRAM_LINK_TOKEN_TTL_MIN ?? '10', 10),
  },

  vision: {
    apiKey: process.env.GOOGLE_VISION_API_KEY ?? '',
    enabled: !!process.env.GOOGLE_VISION_API_KEY,
  },

  errorNotifier: {
    botToken: process.env.ERROR_BOT ?? '',
    name: process.env.ERROR_NAME ?? 'error',
    // Comma-separated Telegram chat IDs allowed to receive error reports.
    chatIds: (process.env.ERROR_CHAT_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  },

  otp: {
    enabled: (process.env.OTP_ENABLED ?? 'true') === 'true',
    ttlSeconds: parseInt(process.env.OTP_TTL ?? '120', 10),
    resendSeconds: parseInt(process.env.OTP_RESCEND ?? '60', 10),
    maxAttempts: parseInt(process.env.OTP_ATTEMPTS ?? '5', 10),
  },

  uploads: {
    dir: process.env.UPLOADS_DIR ?? 'uploads',
    maxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB ?? '5', 10),
  },
});
