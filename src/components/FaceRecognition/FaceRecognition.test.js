import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import FaceRecognition, { getFaceOverlayStyle, getProminentExpression } from './FaceRecognition';

const faces = [
  {
    box: { left_col: 100, top_row: 100, right_col: 300, bottom_row: 350 },
    likelihoods: {
      joyLikelihood: 'VERY_LIKELY',
      sorrowLikelihood: 'VERY_UNLIKELY',
      angerLikelihood: 'UNLIKELY',
      surpriseLikelihood: 'POSSIBLE',
      headwearLikelihood: 'LIKELY',
      blurredLikelihood: 'UNKNOWN',
      underExposedLikelihood: 'UNLIKELY'
    },
    orientation: { rollAngle: 2.5, panAngle: -4, tiltAngle: 0 },
    landmarks: [{ type: 'LEFT_EYE', position: { x: 150, y: 180 } }]
  },
  {
    box: { left_col: 600, top_row: 150, right_col: 850, bottom_row: 400 },
    likelihoods: {
      joyLikelihood: 'UNLIKELY',
      sorrowLikelihood: 'VERY_UNLIKELY',
      angerLikelihood: 'LIKELY',
      surpriseLikelihood: 'UNLIKELY'
    },
    orientation: { rollAngle: -1, panAngle: 5, tiltAngle: 3 },
    landmarks: [{ type: 'NOSE_TIP', position: { x: 725, y: 260 } }]
  }
];

const renderFaceRecognition = (faceData = faces) => {
  const result = render(
    <FaceRecognition imageUrl="https://example.com/image.jpg" faces={faceData} />
  );
  const image = screen.getByAltText('Submitted for face analysis');
  image.getBoundingClientRect = jest.fn(() => ({
    width: 500,
    height: 250,
    top: 0,
    left: 0,
    right: 500,
    bottom: 250,
    x: 0,
    y: 0,
    toJSON: () => ({})
  }));
  Object.defineProperties(image, {
    naturalWidth: { configurable: true, value: 1000 },
    naturalHeight: { configurable: true, value: 500 }
  });
  fireEvent.load(image);
  return result;
};

test('scales and clips face coordinates independently for image dimensions', () => {
  expect(getFaceOverlayStyle(
    { left_col: 100, top_row: 50, right_col: 500, bottom_row: 250 },
    2000,
    1000,
    500,
    250
  )).toEqual({
    left: '25px',
    top: '12.5px',
    width: '100px',
    height: '50px'
  });

  expect(getFaceOverlayStyle(
    { left_col: 100, top_row: 50, right_col: 500, bottom_row: 250 },
    1000,
    500,
    400,
    300
  )).toEqual({
    left: '40px',
    top: '30px',
    width: '160px',
    height: '120px'
  });

  expect(getFaceOverlayStyle(
    { left_col: -10, top_row: 20, right_col: 1200, bottom_row: 600 },
    1000,
    500,
    500,
    250
  )).toEqual({
    left: '0px',
    top: '10px',
    width: '500px',
    height: '240px'
  });
});

test('recalculates overlay positions when the displayed image is resized', () => {
  const { container } = renderFaceRecognition();
  const image = screen.getByAltText('Submitted for face analysis');
  const overlay = container.querySelector('.face-overlay');
  let renderedWidth = 500;
  let renderedHeight = 250;
  image.getBoundingClientRect.mockImplementation(() => ({
    width: renderedWidth,
    height: renderedHeight,
    top: 0,
    left: 0,
    right: renderedWidth,
    bottom: renderedHeight,
    x: 0,
    y: 0,
    toJSON: () => ({})
  }));

  renderedWidth = 300;
  renderedHeight = 150;
  fireEvent.resize(window);

  expect(overlay).toHaveStyle({
    left: '30px',
    top: '30px',
    width: '60px',
    height: '75px'
  });
});

test('requires a strong, unambiguous likelihood for a prominent expression', () => {
  expect(getProminentExpression({
    joyLikelihood: 'UNKNOWN',
    sorrowLikelihood: null,
    angerLikelihood: 'VERY_UNLIKELY',
    surpriseLikelihood: 'LIKELY'
  })).toMatchObject({ expression: 'Surprised' });
  expect(getProminentExpression({
    joyLikelihood: 'LIKELY',
    sorrowLikelihood: 'UNLIKELY',
    angerLikelihood: 'LIKELY',
    surpriseLikelihood: 'VERY_UNLIKELY'
  })).toMatchObject({ message: 'Mixed or unclear expression' });
  expect(getProminentExpression({
    joyLikelihood: 'LIKELY',
    sorrowLikelihood: 'UNLIKELY',
    angerLikelihood: 'VERY_LIKELY',
    surpriseLikelihood: 'VERY_UNLIKELY'
  })).toMatchObject({ expression: 'Angry' });
  expect(getProminentExpression({
    joyLikelihood: 'POSSIBLE',
    sorrowLikelihood: null,
    angerLikelihood: 'VERY_UNLIKELY',
    surpriseLikelihood: 'UNLIKELY'
  })).toMatchObject({ message: 'No prominent expression detected' });
});

test('renders expression labels without emoji characters', () => {
  const { container } = renderFaceRecognition();
  expect(container.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
});

test('renders clean, distinct face overlays and matching analysis cards', () => {
  const { container } = renderFaceRecognition();
  const overlays = container.querySelectorAll('.face-overlay');
  const cards = container.querySelectorAll('.face-analysis');

  expect(overlays).toHaveLength(2);
  expect(cards).toHaveLength(2);
  expect(overlays[0]).toHaveStyle({
    left: '50px',
    top: '50px',
    width: '100px',
    height: '125px'
  });
  expect(overlays[1]).toHaveStyle({
    left: '300px',
    top: '75px',
    width: '125px',
    height: '125px'
  });
  expect(container.querySelectorAll('.face-landmark')).toHaveLength(0);
  expect(screen.getByText('Facial Analysis Results')).toBeInTheDocument();
  expect(screen.getByText('Happy', { selector: '.face-overlay-expression' })).toBeInTheDocument();
  expect(screen.getByText('Angry', { selector: '.face-overlay-expression' })).toBeInTheDocument();
  expect(screen.getByText('Very Likely')).toBeInTheDocument();
  expect(screen.getAllByText('Not determined').length).toBeGreaterThan(0);
  expect(screen.getByText('2.5°')).toBeInTheDocument();
  expect(screen.getByText('-4.0°')).toBeInTheDocument();

  const firstCard = cards[0];
  const secondCard = cards[1];
  expect(within(firstCard).getByText('Happy')).toBeInTheDocument();
  expect(within(secondCard).getByText('Angry')).toBeInTheDocument();
  expect(within(firstCard).queryByText(/nose tip/)).not.toBeInTheDocument();
  expect(within(secondCard).queryByText(/left eye/)).not.toBeInTheDocument();
});

test('keeps the image and overlays after a successful browser image load', () => {
  const onImageError = jest.fn();
  const { container } = render(
    <FaceRecognition
      imageUrl="https://example.com/image.jpg"
      faces={faces}
      onImageError={onImageError}
    />
  );
  const image = screen.getByAltText('Submitted for face analysis');
  image.getBoundingClientRect = jest.fn(() => ({
    width: 500,
    height: 250,
    top: 0,
    left: 0,
    right: 500,
    bottom: 250,
    x: 0,
    y: 0,
    toJSON: () => ({})
  }));
  Object.defineProperties(image, {
    naturalWidth: { configurable: true, value: 1000 },
    naturalHeight: { configurable: true, value: 500 }
  });

  fireEvent.load(image);

  expect(screen.getByAltText('Submitted for face analysis')).toBeInTheDocument();
  expect(container.querySelectorAll('.face-overlay')).toHaveLength(2);
  expect(onImageError).not.toHaveBeenCalled();
});

test('hides a failed image and overlays, resets selection, and notifies the parent', () => {
  const onImageError = jest.fn();
  const { container } = render(
    <FaceRecognition
      imageUrl="https://example.com/image.jpg"
      faces={faces}
      onImageError={onImageError}
    />
  );
  const failedImage = screen.getByAltText('Submitted for face analysis');
  failedImage.getBoundingClientRect = jest.fn(() => ({
    width: 500,
    height: 250,
    top: 0,
    left: 0,
    right: 500,
    bottom: 250,
    x: 0,
    y: 0,
    toJSON: () => ({})
  }));
  Object.defineProperties(failedImage, {
    naturalWidth: { configurable: true, value: 1000 },
    naturalHeight: { configurable: true, value: 500 }
  });
  fireEvent.load(failedImage);
  fireEvent.click(screen.getByRole('button', { name: 'Select analysis for Face 1' }));
  expect(container.querySelector('.face-analysis')).toHaveClass('is-selected');
  fireEvent.error(failedImage);

  expect(onImageError).toHaveBeenCalledWith('https://example.com/image.jpg');
  expect(container.querySelector('.face-analysis')).not.toHaveClass('is-selected');
  expect(screen.queryByAltText('Submitted for face analysis')).not.toBeInTheDocument();
  expect(container.querySelectorAll('.face-overlay')).toHaveLength(0);
});

test('selecting a face card and its box highlights the corresponding pair', () => {
  const { container } = renderFaceRecognition();
  const overlays = container.querySelectorAll('.face-overlay');
  const cards = container.querySelectorAll('.face-analysis');

  fireEvent.click(within(cards[1]).getByText('Expressions'));
  expect(overlays[1]).toHaveAttribute('aria-pressed', 'true');
  expect(cards[1]).toHaveClass('is-selected');
  expect(overlays[0]).toHaveAttribute('aria-pressed', 'false');

  fireEvent.click(overlays[0]);
  expect(overlays[0]).toHaveAttribute('aria-pressed', 'true');
  expect(cards[0]).toHaveClass('is-selected');
  expect(cards[1]).not.toHaveClass('is-selected');

  fireEvent.click(within(cards[1]).getByText('Facial Characteristics'));
  expect(overlays[1]).toHaveAttribute('aria-pressed', 'true');
  expect(cards[1]).toHaveClass('is-selected');
  expect(cards[0]).not.toHaveClass('is-selected');
});

test('keeps landmark details collapsed until requested and does not draw image markers', () => {
  const { container } = renderFaceRecognition();
  const firstCard = container.querySelectorAll('.face-analysis')[0];
  const details = within(firstCard).getByText('View Facial Landmarks').closest('details');

  expect(details).not.toHaveAttribute('open');
  fireEvent.click(within(firstCard).getByText('View Facial Landmarks'));

  expect(details).toHaveAttribute('open');
  expect(within(firstCard).getByText('left eye')).toBeInTheDocument();
  expect(within(firstCard).getByText('150.0, 180.0')).toBeInTheDocument();
  expect(container.querySelectorAll('.face-landmark')).toHaveLength(0);
});

test('shows no prominent expression when response likelihoods are missing', () => {
  renderFaceRecognition([{ ...faces[0], likelihoods: {} }]);
  expect(screen.getAllByText('No prominent expression detected')).toHaveLength(2);
  expect(screen.getAllByText('Not determined').length).toBeGreaterThan(0);
});
