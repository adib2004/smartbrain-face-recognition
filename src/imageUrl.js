export function validateImageUrl(value) {
  const url = typeof value === 'string' ? value.trim() : '';
  if (!url) {
    return { url: '', error: 'Please enter an image URL.' };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { url: '', error: 'Please enter a valid image URL.' };
  }

  if (
    !['http:', 'https:'].includes(parsedUrl.protocol) ||
    !parsedUrl.hostname ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    return { url: '', error: 'Please enter a valid HTTP or HTTPS image URL.' };
  }

  return { url: parsedUrl.toString(), error: '' };
}
