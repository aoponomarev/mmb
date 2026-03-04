/**
 * #JS-gugGqgrV
 * @description Tests for env-rules: validateEnv, envSchema.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEnv } from './env-rules.js';

const validEnv = {
    CLOUDFLARE_API_TOKEN: 'token',
    CLOUDFLARE_ACCOUNT_ID: 'acc',
    CLOUDFLARE_ZONE_ID: 'zone',
    CLOUDFLARE_D1_DATABASE_ID: 'd1',
    DB_HOST: 'host',
    DB_NAME: 'db',
    DB_USER: 'user',
    DB_PASSWORD: 'pw',
    SYS_SECRET_ARCHIVE_KEY: 'this-is-a-very-long-secret-archive-key-for-test'
};

test('validateEnv: passes with valid required variables', () => {
    const data = validateEnv(validEnv);
    assert.equal(data.DB_PORT, 6432); // Check default transformation
    assert.equal(data.DATA_PLANE_ACTIVE_APP, 'TARGET');
});

test('validateEnv: fails when required variables are missing', () => {
    const invalidEnv = { ...validEnv };
    delete invalidEnv.DB_HOST;

    assert.throws(
        () => validateEnv(invalidEnv),
        /Environment validation failed:[\s\S]*DB_HOST:/
    );
});

test('validateEnv: fails when SYS_SECRET_ARCHIVE_KEY is too short', () => {
    const invalidEnv = { ...validEnv, SYS_SECRET_ARCHIVE_KEY: 'short' };

    assert.throws(
        () => validateEnv(invalidEnv),
        /SYS_SECRET_ARCHIVE_KEY: Secret archive key must be at least 32 characters long/
    );
});
