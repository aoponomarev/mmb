import test from 'node:test';
import assert from 'node:assert/strict';
import { fileNameSchema, moduleNameSchema, relativePathSchema } from './naming-rules.js';

test('fileNameSchema: valid kebab-case without forbidden terms', () => {
    const result = fileNameSchema.safeParse('user-profile');
    assert.equal(result.success, true);
});

test('fileNameSchema: invalid format (camelCase)', () => {
    const result = fileNameSchema.safeParse('userProfile');
    assert.equal(result.success, false);
});

test('fileNameSchema: fails on forbidden term MBB', () => {
    const result = fileNameSchema.safeParse('mbb-user');
    assert.equal(result.success, false);
    assert.match(result.error.issues[0].message, /legacy terms/);
});

test('fileNameSchema: fails on forbidden term MMB (case-insensitive)', () => {
    const result = fileNameSchema.safeParse('user-mmb');
    assert.equal(result.success, false);
    assert.match(result.error.issues[0].message, /legacy terms/);
});

test('fileNameSchema: allows forbidden term MMB if context is cloudflare', () => {
    const result = fileNameSchema.safeParse('cloudflare-mmb-worker');
    assert.equal(result.success, true);
});

test('relativePathSchema: allows forbidden term MBB if path contains yandex', () => {
    const result = relativePathSchema.safeParse('is/yandex/mbb-function/index.js');
    assert.equal(result.success, true);
});

test('moduleNameSchema: valid allowed prefix', () => {
    const result = moduleNameSchema.safeParse('app-header');
    assert.equal(result.success, true);
});

test('moduleNameSchema: invalid prefix', () => {
    const result = moduleNameSchema.safeParse('utils-header');
    assert.equal(result.success, false);
    assert.match(result.error.issues[0].message, /must start with one of/);
});

test('relativePathSchema: valid path', () => {
    const result = relativePathSchema.safeParse('is/contracts/naming/index.js');
    assert.equal(result.success, true);
});

test('relativePathSchema: invalid path with forbidden term', () => {
    const result = relativePathSchema.safeParse('is/mbb/index.js');
    assert.equal(result.success, false);
    assert.match(result.error.issues[0].message, /legacy terms/);
});
