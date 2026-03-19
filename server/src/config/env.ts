// Variables required in ALL environments (dev + prod)
const ALWAYS_REQUIRED_VARS = [
  'DATABASE_URL',
  'JWT_SECRET', // Must never fall back to a default; enforced at startup
] as const;

// Variables required only in production
const PROD_REQUIRED_VARS = [] as const;

const OPTIONAL_WARN_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID',
  'STRIPE_PRICE_PRO_MONTHLY',
  'STRIPE_PRICE_PRO_ANNUAL',
] as const;

export function validateEnv(): void {
  // Always check critical secrets — prevent insecure default fallbacks
  const missingCritical = ALWAYS_REQUIRED_VARS.filter((v) => !process.env[v]);
  if (missingCritical.length > 0) {
    // Use process.exit so server never starts without proper secrets
    console.error(
      `[FATAL] Missing required environment variables: ${missingCritical.join(', ')}. ` +
      `Server will not start. Copy server/.env.example to server/.env and set all values.`
    );
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production') {
    const missing = PROD_REQUIRED_VARS.filter((v) => !process.env[v]);
    if (missing.length > 0) {
      console.error(`[FATAL] Missing production environment variables: ${missing.join(', ')}`);
      process.exit(1);
    }
  }

  const missingOptional = OPTIONAL_WARN_VARS.filter((v) => !process.env[v]);
  if (missingOptional.length > 0) {
    console.warn(`[WARN] Missing optional environment variables (billing features disabled): ${missingOptional.join(', ')}`);
  }
}
