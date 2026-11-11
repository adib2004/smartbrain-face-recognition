function validateImageUrl(value) {
  const imageUrl = typeof value === 'string' ? value.trim() : '';
  let parsedUrl;

  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return null;
  }

  if (
    !['http:', 'https:'].includes(parsedUrl.protocol) ||
    !parsedUrl.hostname ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    return null;
  }

  return parsedUrl;
}

module.exports = validateImageUrl;
