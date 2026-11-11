import { validateImageUrl } from './imageUrl';

test.each([
  ['', 'Please enter an image URL.'],
  ['   \t ', 'Please enter an image URL.'],
  ['not a URL', 'Please enter a valid image URL.'],
  ['ftp://example.com/image.jpg', 'Please enter a valid HTTP or HTTPS image URL.'],
  ['https://', 'Please enter a valid image URL.'],
  ['https://user:pass@example.com/image.jpg', 'Please enter a valid HTTP or HTTPS image URL.']
])('rejects invalid URL input %j', (input, message) => {
  expect(validateImageUrl(input)).toEqual({ url: '', error: message });
});

test.each([
  ['https://example.com/image.jpg', 'https://example.com/image.jpg'],
  ['  http://example.com/image.png  ', 'http://example.com/image.png']
])('accepts and trims valid URL input %j', (input, url) => {
  expect(validateImageUrl(input)).toEqual({ url, error: '' });
});
