require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./src/config/db');
const routes = require('./src/routes');
const { errorHandler } = require('./src/middleware/errorHandler');
const socketHandler = require('./src/sockets/socketHandler');
const { setIo } = require('./src/sockets/registry');

const app = express();
const server = http.createServer(app);

/**
 * Allowed browser origins.
 *
 * A single hardcoded origin made a port mismatch catastrophic and invisible:
 * requests still reached the server and appeared in the log, but the browser
 * discarded every response, so the site loaded and then did nothing — no jobs,
 * no sign-in, no registration, and no error a user could act on. In
 * development we therefore accept both Vite ports rather than failing silently
 * over a one-digit difference. Production still honours CLIENT_URL exactly.
 */
const ALLOWED_ORIGINS = (() => {
  const configured = (process.env.CLIENT_URL || 'http://localhost:5174')
    .split(',').map((s) => s.trim()).filter(Boolean);

  if (process.env.NODE_ENV === 'production') return configured;

  const set = new Set(configured);
  set.add('http://localhost:5173');
  set.add('http://localhost:5174');
  return [...set];
})();

const corsOptions = {
  // No origin means a same-origin or non-browser caller (curl, the mobile
  // app, a health check) — those are not what CORS is protecting against.
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    console.warn(`[CORS] refused origin ${origin}. Allowed: ${ALLOWED_ORIGINS.join(', ')}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Connect Database
connectDB();

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log requests
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

// Avatars are public by design; CVs are NOT served statically — they go through
// an authorised download route in cvController.
app.use('/uploads/avatars', express.static(require('path').join(__dirname, 'uploads', 'avatars')));

// API Routes
app.use('/api', routes);

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Fursad Platform API' });
});

// Initialize Socket.IO handlers. The registry lets controllers push events
// without threading `io` through every call signature.
setIo(io);
socketHandler(io);

// Global Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`Accepting browser requests from: ${ALLOWED_ORIGINS.join(', ')}`);
});
