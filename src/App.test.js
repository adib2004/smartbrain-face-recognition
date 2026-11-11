import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('./components/Signin/Signin', () => function TestSignin({ loadUser, onRouteChange }) {
  return (
    <button
      type="button"
      onClick={() => {
        loadUser({ id: 'user-1', name: 'Test User', token: 'signed-token', entries: 0 });
        onRouteChange('home');
      }}
    >
      Test sign in
    </button>
  );
});

const enterHome = () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Test sign in' }));
};

const enterUrl = (value) => {
  fireEvent.change(screen.getByRole('textbox'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Detect' }));
};

beforeEach(() => {
  global.fetch = jest.fn();
});

test.each([
  ['', 'Please enter an image URL.'],
  ['   \t ', 'Please enter an image URL.'],
  ['not a URL', 'Please enter a valid image URL.'],
  ['ftp://example.com/image.jpg', 'Please enter a valid HTTP or HTTPS image URL.']
])('does not send invalid input %j to the backend', (value, message) => {
  enterHome();
  enterUrl(value);

  expect(global.fetch).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent(message);
  expect(document.querySelector('#inputimage')).not.toBeInTheDocument();
});

test('clears prior image, boxes, and analysis when a new URL is invalid', async () => {
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      entries: 1,
      faces: [{
        vertices: [
          { x: 100, y: 80 },
          { x: 300, y: 80 },
          { x: 300, y: 320 },
          { x: 100, y: 320 }
        ],
        likelihoods: {
          joyLikelihood: 'VERY_LIKELY',
          sorrowLikelihood: 'VERY_UNLIKELY',
          angerLikelihood: 'VERY_UNLIKELY',
          surpriseLikelihood: 'VERY_UNLIKELY'
        },
        orientation: {},
        landmarks: []
      }]
    })
  });
  enterHome();
  enterUrl('https://example.com/image.jpg');

  expect(await screen.findByText('Facial Analysis Results')).toBeInTheDocument();
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
  expect(document.querySelector('.face-overlay')).toBeInTheDocument();

  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'not a URL' } });
  fireEvent.click(screen.getByRole('button', { name: 'Detect' }));

  expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid image URL.');
  expect(screen.queryByAltText('Submitted for face analysis')).not.toBeInTheDocument();
  expect(screen.queryByText('Facial Analysis Results')).not.toBeInTheDocument();
  expect(document.querySelector('.face-overlay')).not.toBeInTheDocument();
});

test('keeps the request locked after image failure, syncs its count, and allows retry after it settles', async () => {
  let resolveFirstRequest;
  global.fetch
    .mockImplementationOnce(() => new Promise((resolve) => {
      resolveFirstRequest = resolve;
    }))
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        entries: 2,
        faces: [{
          vertices: [{ x: 100, y: 80 }, { x: 300, y: 80 }, { x: 300, y: 320 }, { x: 100, y: 320 }],
          likelihoods: {
            joyLikelihood: 'UNLIKELY',
            sorrowLikelihood: 'VERY_UNLIKELY',
            angerLikelihood: 'LIKELY',
            surpriseLikelihood: 'VERY_UNLIKELY'
          },
          orientation: {},
          landmarks: []
        }]
      })
    });

  enterHome();
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'https://example.com/first.jpg' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Detect' }));
  expect(global.fetch).toHaveBeenCalledTimes(1);

  fireEvent.error(screen.getByAltText('Submitted for face analysis'));
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Unable to load this image. Please check the image URL and try again.'
  );
  expect(screen.queryByAltText('Submitted for face analysis')).not.toBeInTheDocument();
  expect(screen.queryByText('Facial Analysis Results')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Detecting...' })).toBeDisabled();

  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'https://example.com/second.jpg' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Detecting...' }));
  expect(global.fetch).toHaveBeenCalledTimes(1);

  await act(async () => {
    resolveFirstRequest({
      ok: true,
      json: async () => ({
        entries: 1,
        faces: [{
          vertices: [{ x: 100, y: 80 }, { x: 300, y: 80 }, { x: 300, y: 320 }, { x: 100, y: 320 }],
          likelihoods: {
            joyLikelihood: 'VERY_LIKELY',
            sorrowLikelihood: 'VERY_UNLIKELY',
            angerLikelihood: 'VERY_UNLIKELY',
            surpriseLikelihood: 'VERY_UNLIKELY'
          },
          orientation: {},
          landmarks: []
        }]
      })
    });
  });

  expect(screen.getByText('1')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Unable to load this image. Please check the image URL and try again.'
  );
  expect(screen.queryByText('Facial Analysis Results')).not.toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Detect' })).toBeEnabled();

  fireEvent.click(screen.getByRole('button', { name: 'Detect' }));
  expect(await screen.findByText('Facial Analysis Results')).toBeInTheDocument();
  expect(screen.getByText('Angry', { selector: '.face-card-expression' })).toBeInTheDocument();
  expect(screen.getByAltText('Submitted for face analysis')).toHaveAttribute(
    'src',
    'https://example.com/second.jpg'
  );
  expect(screen.getByRole('button', { name: 'Detect' })).toBeEnabled();
});

test('signing out invalidates a pending request and resets detection state', async () => {
  let resolveRequest;
  global.fetch.mockReturnValue(new Promise((resolve) => {
    resolveRequest = resolve;
  }));
  enterHome();
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'https://example.com/pending.jpg' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Detect' }));
  expect(screen.getByRole('button', { name: 'Detecting...' })).toBeDisabled();

  fireEvent.click(screen.getByText('Sign Out'));
  expect(screen.getByRole('button', { name: 'Test sign in' })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();

  await act(async () => {
    resolveRequest({
      ok: true,
      json: async () => ({
        entries: 1,
        faces: [{
          vertices: [{ x: 100, y: 80 }, { x: 300, y: 80 }, { x: 300, y: 320 }, { x: 100, y: 320 }],
          likelihoods: { joyLikelihood: 'VERY_LIKELY' },
          orientation: {},
          landmarks: []
        }]
      })
    });
  });

  fireEvent.click(screen.getByRole('button', { name: 'Test sign in' }));
  expect(screen.getByText('0')).toBeInTheDocument();
  expect(screen.queryByText('Facial Analysis Results')).not.toBeInTheDocument();
  expect(screen.queryByAltText('Submitted for face analysis')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Detect' })).toBeEnabled();
});

test.each([
  'https://example.com/image.jpg',
  'http://example.com/image.png'
])('submits a valid URL after trimming whitespace: %s', async (value) => {
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ faces: [], entries: 1 })
  });
  enterHome();
  enterUrl(`  ${value}  `);

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  expect(JSON.parse(global.fetch.mock.calls[0][1].body).input).toBe(value);
});

test('disables Detect and prevents repeat submissions while a request is pending', async () => {
  let resolveRequest;
  global.fetch.mockReturnValue(new Promise((resolve) => {
    resolveRequest = resolve;
  }));
  enterHome();
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'https://example.com/image.jpg' }
  });

  fireEvent.click(screen.getByRole('button', { name: 'Detect' }));
  const loadingButton = screen.getByRole('button', { name: 'Detecting...' });
  expect(loadingButton).toBeDisabled();
  fireEvent.click(loadingButton);
  expect(global.fetch).toHaveBeenCalledTimes(1);

  resolveRequest({ ok: true, json: async () => ({ faces: [], entries: 1 }) });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Detect' })).toBeEnabled());
});

test('restores Detect after successful response and updates the returned entry count', async () => {
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ faces: [], entries: 1 })
  });
  enterHome();
  enterUrl('https://example.com/image.jpg');

  await waitFor(() => expect(screen.getByRole('button', { name: 'Detect' })).toBeEnabled());
  expect(screen.getByText('1')).toBeInTheDocument();
});

test('restores Detect and displays backend errors after a failed response', async () => {
  global.fetch.mockResolvedValue({
    ok: false,
    json: async () => ({ error: 'The image URL could not be accessed or the resource is not a supported image.' })
  });
  enterHome();
  enterUrl('https://example.com/page');

  expect(await screen.findByRole('alert')).toHaveTextContent(/could not be accessed/);
  expect(screen.getByRole('button', { name: 'Detect' })).toBeEnabled();
});

test('restores Detect and reports a connection failure', async () => {
  global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
  enterHome();
  enterUrl('https://example.com/image.jpg');

  expect(await screen.findByRole('alert')).toHaveTextContent(/Unable to reach the face detection service/);
  expect(screen.getByRole('button', { name: 'Detect' })).toBeEnabled();
});
