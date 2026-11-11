import React from 'react';
import './FaceRecognition.css';

const likelihoodLabels = {
  VERY_UNLIKELY: 'Very Unlikely',
  UNLIKELY: 'Unlikely',
  POSSIBLE: 'Possible',
  LIKELY: 'Likely',
  VERY_LIKELY: 'Very Likely',
  UNKNOWN: 'Not determined'
};

const expressionFields = [
  { field: 'joyLikelihood', label: 'Joy', expression: 'Happy' },
  { field: 'sorrowLikelihood', label: 'Sorrow', expression: 'Sad' },
  { field: 'angerLikelihood', label: 'Anger', expression: 'Angry' },
  { field: 'surpriseLikelihood', label: 'Surprise', expression: 'Surprised' }
];

const characteristicFields = [
  { field: 'headwearLikelihood', label: 'Headwear' },
  { field: 'blurredLikelihood', label: 'Blur' },
  { field: 'underExposedLikelihood', label: 'Underexposure' }
];

const orientationFields = [
  { field: 'rollAngle', label: 'Roll' },
  { field: 'panAngle', label: 'Pan' },
  { field: 'tiltAngle', label: 'Tilt' }
];

const getLikelihood = (value) => (
  typeof value === 'string' && likelihoodLabels[value] ? value : 'UNKNOWN'
);

const formatLikelihood = (value) => likelihoodLabels[getLikelihood(value)];

export const getProminentExpression = (likelihoods = {}) => {
  const availableLikelihoods = likelihoods && typeof likelihoods === 'object' ? likelihoods : {};
  const confidence = { LIKELY: 1, VERY_LIKELY: 2 };
  const candidates = expressionFields.map((expression) => {
    const likelihood = getLikelihood(availableLikelihoods[expression.field]);
    return {
      ...expression,
      likelihood,
      confidence: confidence[likelihood] ?? null
    };
  });

  const strongCandidates = candidates.filter(({ confidence: value }) => value !== null);
  if (strongCandidates.length === 0) return { message: 'No prominent expression detected' };

  const highestConfidence = Math.max(...strongCandidates.map(({ confidence: value }) => value));
  const strongest = strongCandidates.filter(({ confidence: value }) => value === highestConfidence);
  return strongest.length === 1
    ? strongest[0]
    : { message: 'Mixed or unclear expression' };
};

const formatLandmarkName = (value) => {
  if (typeof value !== 'string' || !value) return 'Unknown landmark';
  return value.toLowerCase().replace(/_/g, ' ');
};

const formatAngle = (value) => (
  Number.isFinite(value) ? `${value.toFixed(1)}°` : 'Unknown'
);

export const getFaceOverlayStyle = (box, imageWidth, imageHeight, renderedWidth, renderedHeight) => {
  if (
    !box ||
    ![imageWidth, imageHeight, renderedWidth, renderedHeight].every((value) => (
      Number.isFinite(value) && value > 0
    )) ||
    ![box.left_col, box.top_row, box.right_col, box.bottom_row].every(Number.isFinite)
  ) {
    return null;
  }

  const left = Math.max(0, Math.min(box.left_col, imageWidth));
  const top = Math.max(0, Math.min(box.top_row, imageHeight));
  const right = Math.max(left, Math.min(box.right_col, imageWidth));
  const bottom = Math.max(top, Math.min(box.bottom_row, imageHeight));
  const scaleX = renderedWidth / imageWidth;
  const scaleY = renderedHeight / imageHeight;

  return {
    left: `${left * scaleX}px`,
    top: `${top * scaleY}px`,
    width: `${(right - left) * scaleX}px`,
    height: `${(bottom - top) * scaleY}px`
  };
};

const ExpressionBadge = ({ expression, className = '' }) => (
  <span className={`expression-badge ${className}`}>
    {expression?.expression || expression?.message || 'No prominent expression detected'}
  </span>
);

const FaceRecognition = ({ imageUrl, faces = [], onImageError }) => {
  const [imageDimensions, setImageDimensions] = React.useState(null);
  const [selectedFace, setSelectedFace] = React.useState(null);
  const [imageLoadFailed, setImageLoadFailed] = React.useState(false);
  const imageRef = React.useRef(null);
  const hasLoadedDimensions = imageDimensions?.src === imageUrl;
  const canShowOverlays = hasLoadedDimensions &&
    imageDimensions.width > 0 &&
    imageDimensions.height > 0 &&
    imageDimensions.renderedWidth > 0 &&
    imageDimensions.renderedHeight > 0;

  React.useEffect(() => {
    setImageLoadFailed(false);
    setImageDimensions(null);
    setSelectedFace(null);
  }, [imageUrl]);

  React.useEffect(() => {
    const image = imageRef.current;
    if (!image) return undefined;

    const updateRenderedSize = () => {
      const { width, height } = image.getBoundingClientRect();
      setImageDimensions((current) => {
        if (current?.src !== imageUrl || (
          current.renderedWidth === width &&
          current.renderedHeight === height
        )) {
          return current;
        }
        return { ...current, renderedWidth: width, renderedHeight: height };
      });
    };

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateRenderedSize);
    resizeObserver?.observe(image);
    window.addEventListener('resize', updateRenderedSize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateRenderedSize);
    };
  }, [imageUrl]);

  return (
    <div className="face-recognition">
      {imageUrl && !imageLoadFailed && (
        <div className="face-image">
          <img
            ref={imageRef}
            id="inputimage"
            alt="Submitted for face analysis"
            src={imageUrl}
            onLoad={(event) => {
              const { width, height } = event.currentTarget.getBoundingClientRect();
              setImageDimensions({
                src: imageUrl,
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
                renderedWidth: width,
                renderedHeight: height
              });
            }}
            onError={() => {
              setImageLoadFailed(true);
              setImageDimensions(null);
              setSelectedFace(null);
              onImageError?.(imageUrl);
            }}
            style={{ width: 'min(100%, 720px)', height: 'auto', display: 'block' }}
          />
          {canShowOverlays && faces.map((face, index) => {
            const expression = getProminentExpression(face.likelihoods);
            const selected = selectedFace === index;
            const overlayStyle = getFaceOverlayStyle(
              face.box,
              imageDimensions.width,
              imageDimensions.height,
              imageDimensions.renderedWidth,
              imageDimensions.renderedHeight
            );
            if (!overlayStyle) return null;

            return (
              <button
                type="button"
                key={`face-overlay-${index}`}
                className={`face-overlay${selected ? ' is-selected' : ''}`}
                aria-label={`Face ${index + 1}: ${expression?.expression || expression?.message || 'No prominent expression detected'}. Select face`}
                aria-pressed={selected}
                onClick={() => setSelectedFace(index)}
                style={overlayStyle}
              >
                <span className="face-box-label">Face {index + 1}</span>
                <ExpressionBadge expression={expression} className="face-overlay-expression" />
              </button>
            );
          })}
        </div>
      )}

      {faces.length > 0 && (
        <section className="face-results" aria-labelledby="face-results-title">
          <div className="face-results-heading">
            <span className="face-results-eyebrow">PERSONALIZED INSIGHTS</span>
            <h2 id="face-results-title">Facial Analysis Results</h2>
            <p>{faces.length} {faces.length === 1 ? 'face' : 'faces'} detected</p>
          </div>

          <div className="face-analysis-list">
            {faces.map((face, index) => {
              const expression = getProminentExpression(face.likelihoods);
              const selected = selectedFace === index;

              return (
                <article
                  className={`face-analysis${selected ? ' is-selected' : ''}`}
                  key={`face-analysis-${index}`}
                  onClick={() => setSelectedFace(index)}
                >
                  <button
                    type="button"
                    className="face-analysis-select"
                    aria-label={`Select analysis for Face ${index + 1}`}
                    aria-pressed={selected}
                  >
                    <span className="face-card-title">FACE {index + 1}</span>
                    <ExpressionBadge expression={expression} className="face-card-expression" />
                  </button>

                  <div className="face-analysis-section">
                    <h3>Expressions</h3>
                    <div className="face-stat-list">
                      {expressionFields.map(({ field, label }) => {
                        const likelihood = getLikelihood(face.likelihoods?.[field]);
                        return (
                          <div className="face-stat" key={field}>
                            <span className="face-stat-label">{label}</span>
                            <span className={`likelihood-badge likelihood-${likelihood.toLowerCase().replace(/_/g, '-')}`}>
                              {formatLikelihood(likelihood)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="face-analysis-section">
                    <h3>Facial Characteristics</h3>
                    <div className="face-stat-list">
                      {characteristicFields.map(({ field, label }) => {
                        const likelihood = getLikelihood(face.likelihoods?.[field]);
                        return (
                          <div className="face-stat" key={field}>
                            <span className="face-stat-label">{label}</span>
                            <span className={`likelihood-badge likelihood-${likelihood.toLowerCase().replace(/_/g, '-')}`}>
                              {formatLikelihood(likelihood)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="face-analysis-section">
                    <h3>Face Orientation</h3>
                    <div className="orientation-list">
                      {orientationFields.map(({ field, label }) => (
                        <div className="orientation-stat" key={field}>
                          <span>{label}</span>
                          <strong>{formatAngle(face.orientation?.[field])}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <details className="face-landmarks-details">
                    <summary>View Facial Landmarks</summary>
                    {face.landmarks?.length ? (
                      <ul className="face-landmark-list">
                        {face.landmarks.map((landmark, landmarkIndex) => (
                          <li key={`${landmark?.type || 'unknown'}-${landmarkIndex}`}>
                            <span>{formatLandmarkName(landmark?.type)}</span>
                            <span>
                              {Number.isFinite(landmark?.position?.x) && Number.isFinite(landmark?.position?.y)
                                ? `${landmark.position.x.toFixed(1)}, ${landmark.position.y.toFixed(1)}`
                                : 'Position unknown'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="face-landmarks-empty">Landmark details are not available.</p>}
                  </details>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default FaceRecognition;
