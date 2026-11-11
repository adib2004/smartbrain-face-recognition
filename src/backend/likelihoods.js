const LIKELIHOOD_FIELDS = [
  'joyLikelihood',
  'sorrowLikelihood',
  'angerLikelihood',
  'surpriseLikelihood',
  'headwearLikelihood',
  'blurredLikelihood',
  'underExposedLikelihood'
];

const VALID_LIKELIHOODS = new Set([
  'UNKNOWN',
  'VERY_UNLIKELY',
  'UNLIKELY',
  'POSSIBLE',
  'LIKELY',
  'VERY_LIKELY'
]);

function normalizeLikelihoods(face = {}) {
  const annotation = face && typeof face === 'object' ? face : {};
  return Object.fromEntries(
    LIKELIHOOD_FIELDS.map((field) => {
      const value = Object.prototype.hasOwnProperty.call(annotation, field) ? annotation[field] : null;
      return [field, typeof value === 'string' && VALID_LIKELIHOODS.has(value) ? value : 'UNKNOWN'];
    })
  );
}

module.exports = normalizeLikelihoods;
