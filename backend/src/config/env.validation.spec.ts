import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('throws when required environment variables are missing', () => {
    expect(() => validateEnv({ JWT_SECRET: 'secret' })).toThrow(
      'Missing required environment variable(s): MONGODB_URI, DEEPSEEK_API_KEY, OPENAI_API_KEY',
    );
  });

  it('returns config when required environment variables are present', () => {
    const config = {
      MONGODB_URI: 'mongodb://localhost/test',
      JWT_SECRET: 'secret',
      DEEPSEEK_API_KEY: 'deepseek-key',
      OPENAI_API_KEY: 'openai-key',
    };

    expect(validateEnv(config)).toBe(config);
  });
});
