const express = require('express');
const app = express();
const dotenv = require('dotenv');
const authRoute = require('./routes/auth');
const userRoute = require('./routes/users');
const qrRoute = require('./routes/qr');
const http = require('http');
const WebSocket = require('ws');
const admin = require('firebase-admin');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const url = require('url');

dotenv.config();

const serviceAccount = {
  type: process.env.SERVICE_ACCOUNT_TYPE,
  project_id: process.env.SERVICE_ACCOUNT_PROJECT_ID,
  private_key_id: process.env.SERVICE_ACCOUNT_PRIVATE_KEY_ID,
  private_key: process.env.SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.SERVICE_ACCOUNT_CLIENT_EMAIL,
  client_id: process.env.SERVICE_ACCOUNT_CLIENT_ID,
  auth_uri: process.env.SERVICE_ACCOUNT_AUTH_URI,
  token_uri: process.env.SERVICE_ACCOUNT_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.SERVICE_ACCOUNT_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.SERVICE_ACCOUNT_CLIENT_CERT_URL,
  universe_domain: process.env.SERVICE_ACCOUNT_UNIVERSE_DOMAIN,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.firestore();

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Security headers
app.use(helmet());

app.use((req, res, next) => {
  req.db = db;
  next();
});

// CORS - only allow specific origins
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // max 15 requests per window
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

app.use('/api/auth', authRoute);
app.use('/api/users', userRoute);
app.use('/api/qr', qrRoute);

// WebSocket connection for real-time updates (with auth)
wss.on('connection', (ws, req) => {
  // Extract token from query string: ws://localhost:8800?token=xxx
  const params = url.parse(req.url, true).query;
  const token = params.token;

  if (!token) {
    ws.close(4401, 'Authentication required');
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    if (!decoded || !decoded.uid) {
      ws.close(4403, 'Invalid token');
      return;
    }
  } catch (err) {
    ws.close(4403, 'Invalid token');
    return;
  }

  const qrcodeRef = db.collection('qrcodes').orderBy('scannedAt', 'desc');

  const unsubscribe = qrcodeRef.onSnapshot(snapshot => {
    const qrcodes = snapshot.docs.map(doc => doc.data());
    ws.send(JSON.stringify(qrcodes));
  });

  ws.on('close', () => {
    unsubscribe();
  });
});

const PORT = process.env.PORT || 8800;
server.listen(PORT, () => {
  console.log(`Backend Server is running on port ${PORT}`);
});
