import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  SMTP2GO_HOST: z.string().min(1),
  SMTP2GO_PORT: z.string().optional(),
  SMTP2GO_USER: z.string().min(1),
  SMTP2GO_PASS: z.string().min(1),
  SMTP2GO_SECURE: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().min(1),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    console.error(`Missing or invalid environment variables: ${missing}`);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Environment validation failed: ${missing}`);
    }
  }
}

validateEnv();
