const assert = require('node:assert/strict');
const test = require('node:test');
const validateImageUrl = require('./imageUrl');
const { classifyVisionError, TEMPORARY_FAILURE_MESSAGE } = require('./visionErrors');

test('backend URL validation accepts trimmed HTTP and HTTPS URLs', () => {
  assert.equal(validateImageUrl(' https://example.com/image.jpg ').href, 'https://example.com/image.jpg');
  assert.equal(validateImageUrl('http://example.com/image.png').protocol, 'http:');
});

test('backend URL validation rejects empty, malformed, unsafe, and credentialed URLs', () => {
  for (const value of ['', '   ', 'not a URL', 'ftp://example.com/image.jpg', 'https://', 'https://a:b@example.com/x']) {
    assert.equal(validateImageUrl(value), null, `expected invalid URL: ${value}`);
  }
});

test('classifies image access and unsupported-resource errors from upstream details', () => {
  for (const message of [
    'Failed to fetch the image URL',
    'The resource is not a supported image'
  ]) {
    const result = classifyVisionError(400, message);
    assert.equal(result.status, 422);
    assert.match(result.error, /publicly accessible image URL/);
  }
});

test('classifies upstream throttling and server failures as temporary', () => {
  for (const status of [408, 429, 500, 502, 503, 504]) {
    assert.deepEqual(classifyVisionError(status), {
      status: 503,
      error: TEMPORARY_FAILURE_MESSAGE
    });
  }
});

test('does not classify unrelated upstream 4xx errors as image-access errors', () => {
  const result = classifyVisionError(403, 'The API key is not authorized');
  assert.equal(result.status, 502);
  assert.equal(result.error, 'Face detection failed. Please check the image URL and try again.');
});
