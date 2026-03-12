const REQUIRED_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
] as const;

const OPTIONAL_WARN_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID',
] as const;

export function validateEnv(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  const missingOptional = OPTIONAL_WARN_VARS.filter((v) => !process.env[v]);
  if (missingOptional.length > 0) {
    console.warn(`Warning: Missing optional environment variables (billing features disabled): ${missingOptional.join(', ')}`);
  }
}
