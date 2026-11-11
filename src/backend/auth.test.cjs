const assert = require('node:assert/strict');
const test = require('node:test');
const { createAuthToken, verifyAuthToken } = require('./auth');

const originalSecret = process.env.AUTH_TOKEN_SECRET;
process.env.AUTH_TOKEN_SECRET = 'test-secret-with-at-least-32-characters';

test('creates a verifiable token bound to the user ID', () => {
  const now = 1_800_000_000_000;
  const token = createAuthToken('daniel-user-id', now);
  assert.equal(verifyAuthToken(token, now), 'daniel-user-id');
});

test('rejects altered, malformed, and expired tokens', () => {
  const now = 1_800_000_000_000;
  const token = createAuthToken('daniel-user-id', now);
  const [payload, signature] = token.split('.');

  assert.equal(verifyAuthToken(`${payload}.${signature.slice(0, -1)}x`, now), null);
  assert.equal(verifyAuthToken('not-a-token', now), null);
  assert.equal(verifyAuthToken(token, now + 7 * 24 * 60 * 60 * 1000), null);
});

test('rejects malformed or missing token secrets', () => {
  const token = createAuthToken('daniel-user-id');
  process.env.AUTH_TOKEN_SECRET = 'too-short';
  assert.throws(() => verifyAuthToken(token), /AUTH_TOKEN_SECRET/);
});

test.after(() => {
  if (originalSecret === undefined) {
    delete process.env.AUTH_TOKEN_SECRET;
  } else {
    process.env.AUTH_TOKEN_SECRET = originalSecret;
  }
});
