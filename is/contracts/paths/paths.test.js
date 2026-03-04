/**
 * #JS-EM3iWwAX
 * @description Tests for paths contract: getAbsolutePath, PATHS, PROJECT_ROOT validation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { getAbsolutePath, PATHS, PROJECT_ROOT } from './paths.js';

test('getAbsolutePath: valid path returns correct absolute path', () => {
    const abs = getAbsolutePath('core/config');
    assert.equal(abs, path.join(PROJECT_ROOT, 'core/config'));
});

test('getAbsolutePath: invalid path throws error (contains forbidden terms)', () => {
    assert.throws(
        () => getAbsolutePath('core/mbb-config'),
        /Path validation failed/
    );
});

test('getAbsolutePath: allows cloud paths with legacy terms', () => {
    const abs = getAbsolutePath('is/cloudflare/mbb-worker');
    assert.equal(abs, path.join(PROJECT_ROOT, 'is/cloudflare/mbb-worker'));
});

test('PATHS registry is valid', () => {
    assert.ok(PATHS.root);
    assert.ok(PATHS.is);
    assert.ok(PATHS.app);
    assert.ok(PATHS.core);
});
