const REQUIRED_ENV_KEYS = [
  'MONGODB_URI',
  'JWT_SECRET',
  'DEEPSEEK_API_KEY',
  'OPENAI_API_KEY',
] as const;

export function validateEnv(config: Record<string, unknown>) {
  const missing = REQUIRED_ENV_KEYS.filter((key) => {
    const value = config[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
  }

  return config;
}
