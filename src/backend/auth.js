const crypto = require('node:crypto');

const TOKEN_LIFETIME_SECONDS = 7 * 24 * 60 * 60;

function getAuthSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) {
    throw new Error('AUTH_TOKEN_SECRET must be configured with at least 32 characters.');
  }
  return secret;
}

function signPayload(encodedPayload, secret) {
  return crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function createAuthToken(userId, now = Date.now()) {
  if (typeof userId !== 'string' || !userId) {
    throw new Error('A valid user ID is required to create an auth token.');
  }
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    exp: Math.floor(now / 1000) + TOKEN_LIFETIME_SECONDS
  })).toString('base64url');
  return `${payload}.${signPayload(payload, getAuthSecret())}`;
}

function verifyAuthToken(token, now = Date.now()) {
  if (typeof token !== 'string') return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return null;

  const expectedSignature = Buffer.from(signPayload(payload, getAuthSecret()), 'base64url');
  const receivedSignature = Buffer.from(signature, 'base64url');
  if (
    expectedSignature.length !== receivedSignature.length ||
    !crypto.timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    return null;
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (
      typeof claims.sub !== 'string' ||
      !claims.sub ||
      !Number.isInteger(claims.exp) ||
      claims.exp <= Math.floor(now / 1000)
    ) {
      return null;
    }
    return claims.sub;
  } catch {
    return null;
  }
}

module.exports = { createAuthToken, getAuthSecret, verifyAuthToken };
