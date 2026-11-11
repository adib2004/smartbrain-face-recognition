const assert = require('node:assert/strict');
const test = require('node:test');
const normalizeLikelihoods = require('./likelihoods');

test('normalizes missing likelihoods to UNKNOWN', () => {
  const likelihoods = normalizeLikelihoods({
    headwearLikelihood: 'VERY_UNLIKELY',
    blurredLikelihood: 'VERY_UNLIKELY',
    underExposedLikelihood: 'VERY_UNLIKELY'
  });

  assert.deepEqual(likelihoods, {
    joyLikelihood: 'UNKNOWN',
    sorrowLikelihood: 'UNKNOWN',
    angerLikelihood: 'UNKNOWN',
    surpriseLikelihood: 'UNKNOWN',
    headwearLikelihood: 'VERY_UNLIKELY',
    blurredLikelihood: 'VERY_UNLIKELY',
    underExposedLikelihood: 'VERY_UNLIKELY'
  });
});

test('preserves each valid Vision likelihood value', () => {
  const likelihoods = normalizeLikelihoods({
    joyLikelihood: 'VERY_LIKELY',
    sorrowLikelihood: 'LIKELY',
    angerLikelihood: 'POSSIBLE',
    surpriseLikelihood: 'UNLIKELY',
    headwearLikelihood: 'VERY_UNLIKELY',
    blurredLikelihood: 'UNKNOWN',
    underExposedLikelihood: 'LIKELY'
  });

  assert.equal(likelihoods.joyLikelihood, 'VERY_LIKELY');
  assert.equal(likelihoods.sorrowLikelihood, 'LIKELY');
  assert.equal(likelihoods.angerLikelihood, 'POSSIBLE');
  assert.equal(likelihoods.surpriseLikelihood, 'UNLIKELY');
  assert.equal(likelihoods.headwearLikelihood, 'VERY_UNLIKELY');
  assert.equal(likelihoods.blurredLikelihood, 'UNKNOWN');
  assert.equal(likelihoods.underExposedLikelihood, 'LIKELY');
});

test('normalizes invalid and non-string values to UNKNOWN', () => {
  const likelihoods = normalizeLikelihoods({
    joyLikelihood: 3,
    sorrowLikelihood: null,
    angerLikelihood: 'NOT_A_LIKELIHOOD',
    surpriseLikelihood: undefined
  });

  assert.equal(likelihoods.joyLikelihood, 'UNKNOWN');
  assert.equal(likelihoods.sorrowLikelihood, 'UNKNOWN');
  assert.equal(likelihoods.angerLikelihood, 'UNKNOWN');
  assert.equal(likelihoods.surpriseLikelihood, 'UNKNOWN');
});
