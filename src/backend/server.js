const express = require('express');
const cors = require('cors');
const crypto = require('node:crypto');
const path = require('node:path');
const { promisify } = require('node:util');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');
const { createAuthToken, getAuthSecret, verifyAuthToken } = require('./auth');
const validateImageUrl = require('./imageUrl');
const normalizeLikelihoods = require('./likelihoods');
const { classifyVisionError, TEMPORARY_FAILURE_MESSAGE } = require('./visionErrors');

const app = express();
app.use(express.json());
app.use(cors()); // Allow requests from your React app

const MONTHLY_FACE_DETECTION_LIMIT = 900;
const database = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000
    })
  : null;
database?.on('error', (error) => console.error('Unexpected PostgreSQL pool error:', error));
const scrypt = promisify(crypto.scrypt);

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    entries: user.entries,
    joined: user.joined
  };
}

function getUtcMonthStart(date = new Date()) {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}-01`;
}

async function reserveFaceDetectionUsage() {
  if (!database) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const result = await database.query(
    `INSERT INTO face_detection_usage (period_start, request_count)
     VALUES ($1, 1)
     ON CONFLICT (period_start)
     DO UPDATE SET request_count = face_detection_usage.request_count + 1
     WHERE face_detection_usage.request_count < $2
     RETURNING request_count`,
    [getUtcMonthStart(), MONTHLY_FACE_DETECTION_LIMIT]
  );
  return result.rows[0]?.request_count ?? null;
}

app.post('/register', async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
    return res.status(400).json({ error: 'Enter a name, valid email, and password.' });
  }

  if (!database) {
    return res.status(503).json({ error: 'Account storage is unavailable. Configure DATABASE_URL on the backend.' });
  }

  try {
    getAuthSecret();
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = await scrypt(password, salt, 64);
    const result = await database.query(
      `INSERT INTO users (id, name, email, entries, password_salt, password_hash)
       VALUES ($1, $2, $3, 0, $4, $5)
       RETURNING id, name, email, entries, joined`,
      [crypto.randomUUID(), name, email, salt, passwordHash.toString('hex')]
    );
    return res.status(201).json({
      ...publicUser(result.rows[0]),
      token: createAuthToken(result.rows[0].id)
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('Error registering user:', error);
    return res.status(503).json({ error: 'Account storage is temporarily unavailable.' });
  }
});

app.post('/signin', async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!database) {
    return res.status(503).json({ error: 'Account storage is unavailable. Configure DATABASE_URL on the backend.' });
  }

  try {
    getAuthSecret();
    const result = await database.query(
      `SELECT id, name, email, entries, joined, password_salt, password_hash
       FROM users
       WHERE email = $1`,
      [email]
    );
    const user = result.rows[0];
    if (!user || !password) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordHash = await scrypt(password, user.password_salt, 64);
    const storedHash = Buffer.from(user.password_hash, 'hex');
    if (storedHash.length !== passwordHash.length || !crypto.timingSafeEqual(storedHash, passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    return res.json({
      ...publicUser(user),
      token: createAuthToken(user.id)
    });
  } catch (error) {
    console.error('Error signing in user:', error);
    return res.status(503).json({ error: 'Account storage is temporarily unavailable.' });
  }
});

app.post('/detect-face', async (req, res) => {
  let userId;
  try {
    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer ([^\s]+)$/i);
    userId = match ? verifyAuthToken(match[1]) : null;
  } catch (error) {
    console.error('Authentication is not configured:', error.message);
    return res.status(503).json({ error: 'Authentication is temporarily unavailable.' });
  }
  if (!userId) {
    return res.status(401).json({ error: 'Sign in is required to detect faces.' });
  }

  const parsedImageUrl = validateImageUrl(req.body?.input);
  if (!parsedImageUrl) {
    return res.status(400).json({ error: 'Provide a valid image URL.' });
  }
  const imageUrl = parsedImageUrl.toString();

  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Face detection is not configured. Set GOOGLE_VISION_API_KEY on the backend.' });
  }

  let requestCount;
  try {
    requestCount = await reserveFaceDetectionUsage();
  } catch (error) {
    console.error('Error reserving face detection usage:', error);
    return res.status(503).json({ error: 'Usage protection is temporarily unavailable. Please try again later.' });
  }
  if (requestCount === null) {
    return res.status(429).json({
      error: 'The monthly face detection limit of 900 requests has been reached. Try again next month.'
    });
  }

  try {
    const response = await fetch('https://vision.googleapis.com/v1/images:annotate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey
      },
      body: JSON.stringify({
        requests: [{
          image: { source: { imageUri: imageUrl } },
          features: [{ type: 'FACE_DETECTION', maxResults: 10 }]
        }]
      })
    });
    const data = await response.json();
    const result = data?.responses?.[0];
    const visionError = result?.error || data?.error;
    if (!response.ok || visionError) {
      const failure = classifyVisionError(
        Number.isInteger(visionError?.code) ? visionError.code : response.status,
        visionError?.message
      );
      return res.status(failure.status).json({ error: failure.error });
    }
    if (!Array.isArray(data?.responses) || !result || typeof result !== 'object') {
      return res.status(502).json({ error: 'Google Cloud Vision returned an invalid response.' });
    }

    const faces = Array.isArray(result?.faceAnnotations)
      ? result.faceAnnotations
          .filter((face) => Array.isArray(face?.boundingPoly?.vertices))
          .map((face) => ({
            vertices: face.boundingPoly.vertices.map((vertex) => ({
              x: Number.isFinite(vertex?.x) ? vertex.x : 0,
              y: Number.isFinite(vertex?.y) ? vertex.y : 0
            })),
            likelihoods: normalizeLikelihoods(face),
            orientation: {
              rollAngle: Number.isFinite(face.rollAngle) ? face.rollAngle : null,
              panAngle: Number.isFinite(face.panAngle) ? face.panAngle : null,
              tiltAngle: Number.isFinite(face.tiltAngle) ? face.tiltAngle : null
            },
            landmarks: Array.isArray(face.landmarks)
              ? face.landmarks.map((landmark) => ({
                  type: typeof landmark?.type === 'string' ? landmark.type : 'UNKNOWN',
                  position: {
                    x: Number.isFinite(landmark?.position?.x) ? landmark.position.x : null,
                    y: Number.isFinite(landmark?.position?.y) ? landmark.position.y : null
                  }
                }))
              : []
          }))
      : [];

    if (faces.length === 0) {
      return res.json({ faces });
    }

    try {
      const entryResult = await database.query(
        `UPDATE users
         SET entries = entries + 1
         WHERE id = $1
         RETURNING entries`,
        [userId]
      );
      if (entryResult.rowCount !== 1) {
        return res.status(401).json({ error: 'The signed-in account is no longer available.' });
      }
      return res.json({ faces, entries: entryResult.rows[0].entries });
    } catch (error) {
      console.error('Error updating user entry count:', error);
      return res.status(503).json({ error: 'Unable to update your entry count. Please try again later.' });
    }
  } catch (error) {
    console.error('Google Cloud Vision request failed.');
    return res.status(503).json({ error: TEMPORARY_FAILURE_MESSAGE });
  }
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  return next(error);
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));