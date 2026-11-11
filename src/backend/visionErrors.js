const TEMPORARY_FAILURE_MESSAGE = 'Google Cloud Vision is temporarily unavailable. Please try again shortly.';
const IMAGE_RESOURCE_ERROR = /\b(fetch|download|access|accessible|unsupported|not a supported image|not an image|invalid image|image format|decode|image uri|imageurl)\b/i;

function classifyVisionError(statusCode, message = '') {
  const status = Number.isInteger(statusCode) ? statusCode : 0;
  if (status === 408 || status === 429 || status >= 500) {
    return {
      status: 503,
      error: TEMPORARY_FAILURE_MESSAGE
    };
  }

  if (IMAGE_RESOURCE_ERROR.test(typeof message === 'string' ? message : '')) {
    return {
      status: 422,
      error: 'The image URL could not be accessed or the resource is not a supported image. Use a publicly accessible image URL.'
    };
  }

  return {
    status: 502,
    error: 'Face detection failed. Please check the image URL and try again.'
  };
}

module.exports = { classifyVisionError, TEMPORARY_FAILURE_MESSAGE };
