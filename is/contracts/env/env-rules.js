/**
 * @skill arch-foundation
 * @description Gatekeeper for environment variables (SSOT for secrets and config).
 */
import { z } from 'zod';

/**
 * Common configuration schema for the application's environment variables.
 * This is the SSOT for what environment variables the app expects.
 */
export const envSchema = z.object({
    // ---------------------------------------------------------
    // 1. Cloudflare Parity Contract
    // ---------------------------------------------------------
    CLOUDFLARE_API_TOKEN: z.string({ required_error: 'Cloudflare API Token is required' }).min(1),
    CLOUDFLARE_ACCOUNT_ID: z.string({ required_error: 'Cloudflare Account ID is required' }).min(1),
    CLOUDFLARE_ZONE_ID: z.string().optional(),
    CLOUDFLARE_D1_DATABASE_ID: z.string({ required_error: 'Cloudflare D1 Database ID is required' }).min(1),

    // ---------------------------------------------------------
    // 2. Yandex Cloud & Postgres Gateway
    // ---------------------------------------------------------
    DB_HOST: z.string({ required_error: 'Database Host is required' }).min(1),
    DB_PORT: z.coerce.number().default(6432),
    DB_NAME: z.string({ required_error: 'Database Name is required' }).min(1),
    DB_USER: z.string({ required_error: 'Database User is required' }).min(1),
    DB_PASSWORD: z.string({ required_error: 'Database Password is required' }).min(1),
    YANDEX_API_KEY: z.string().optional(),

    // ---------------------------------------------------------
    // 3. AI Providers
    // ---------------------------------------------------------
    MISTRAL_API_KEY: z.string().optional(),
    GROQ_API_KEY: z.string().optional(),
    OPENROUTER_API_KEY: z.string().optional(),

    // ---------------------------------------------------------
    // 4. Data Providers
    // ---------------------------------------------------------
    COINGECKO_API_KEY: z.string().optional(),

    // ---------------------------------------------------------
    // 5. Infrastructure & Security
    // ---------------------------------------------------------
    // Shared datasets safety contract: only one app is active writer at a time
    DATA_PLANE_ACTIVE_APP: z.enum(['TARGET', 'LEGACY']).default('TARGET'),
    
    // Local encrypted archive key for Secret Resilience (renamed from MMB_SECRET_ARCHIVE_KEY)
    SYS_SECRET_ARCHIVE_KEY: z.string({ required_error: 'SYS_SECRET_ARCHIVE_KEY is required' }).min(32, 'Secret archive key must be at least 32 characters long')
});

/**
 * Validates process.env against the schema.
 * Throws a formatted error if validation fails.
 */
export function validateEnv(env = process.env) {
    const result = envSchema.safeParse(env);
    
    if (!result.success) {
        const errors = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
        throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }
    
    return result.data;
}
