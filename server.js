require('dotenv').config();
const express = require('express');
const fs = require('fs');

const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const { logSuspiciousActivity } = require('./middleware/security');


// Environment variables loaded at the very top

const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// ─── Store & Marketplace Routers (MongoDB-backed) ──────────────
const storeRouter = require('./routes/store');
const booksRoutes = require('./routes/booksRoutes');
const ordersRoutes = require('./routes/ordersRoutes');
const cartRoutes = require('./routes/cartRoutes');
const sellersRoutes = require('./routes/sellersRoutes');
const reviewsRoutes = require('./routes/reviewsRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const chatsRoutes = require('./routes/chatsRoutes');
// ─── Used Books Marketplace (simple, no Seller model needed) ─────
const usedBooksRoutes = require('./routes/usedBooksRoutes');

// ─── Course Platform Routers ──────────────────────────────────────
const paymentRoutes = require('./routes/paymentRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const courseRoutes = require('./routes/courseRoutes');

// ─── Community Routers (New) ──────────────────────────────────────
const communityRoutes = require('./routes/community');
const dashboardRoutes = require('./routes/dashboardRoutes');

// ─── Environment Configuration Setup ────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.MONGO_URI) console.warn('⚠️ MONGO_URI is missing.');
if (!process.env.GOOGLE_CLIENT_ID) console.warn('⚠️ GOOGLE_CLIENT_ID is missing. Google OAuth will fail.');
if (!process.env.GOOGLE_CLIENT_SECRET) console.warn('⚠️ GOOGLE_CLIENT_SECRET is missing. Google OAuth will fail.');
if (!process.env.JWT_SECRET) console.warn('⚠️ JWT_SECRET is missing. Using insecure fallback secret.');
if (!process.env.BASE_URL) console.warn('⚠️ BASE_URL is missing. Webhook notify_url will default to localhost — payments WON\'T work in production!');
// ─── Cashfree Env Validation ──────────────────────────────────────
if (!process.env.CASHFREE_APP_ID) console.error('❌ CASHFREE_APP_ID is missing! Payments will fail.');
if (!process.env.CASHFREE_SECRET_KEY) console.error('❌ CASHFREE_SECRET_KEY is missing! Webhook verification will fail.');
if (process.env.BASE_URL && process.env.BASE_URL.includes('localhost') && process.env.NODE_ENV === 'production') {
    console.error('❌ BASE_URL is still localhost in production! Cashfree webhook notify_url will be unreachable.');
}

// ─── MongoDB Connection ───────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ CRITICAL ERROR: MONGO_URI missing in production! Exiting...');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected:', MONGO_URI.split('@').pop() || MONGO_URI))
  .catch(err => {
      console.error('❌ MongoDB connection error:', err.message);
      if (isProduction) process.exit(1);
  });

const DATA_FILE = path.join(__dirname, 'data', 'users.json');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'DUMMY_CLIENT_ID';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'DUMMY_CLIENT_SECRET';
const JWT_SECRET = process.env.JWT_SECRET || 'Dhiraj@2026_secure_key!';

const StoreUser = require('./models/User');
const CourseProgress = require('./models/CourseProgress');

passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  // ✅ PORT 5000 UNIFICATION: Configured callback
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'https://www.coursenova.in/api/auth/google/callback',
  proxy: true
},

  async function (accessToken, refreshToken, profile, done) {
    try {
      console.log('Google Auth Attempt:', profile.emails[0].value);
      let user = await StoreUser.findOne({ googleId: profile.id });

      if (!user) {
        user = new StoreUser({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails && profile.emails.length > 0 ? profile.emails[0].value : '',
          picture: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : '',
          role: 'student',
          lastLogin: new Date()
        });
        await user.save();
        console.log('New user registered:', user.email);
      } else {
        user.lastLogin = new Date();
        user.name = profile.displayName;
        if (profile.photos && profile.photos.length > 0) user.picture = profile.photos[0].value;
        await user.save();
      }
      return done(null, user);
    } catch (err) {
      console.error('Google Strategy Error:', err);
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await StoreUser.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

function readUsers() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function findUserByEmailOrMobile(identifier) {
  const users = readUsers();
  return users.find(u => (u.email && u.email.toLowerCase() === (identifier || '').toLowerCase()) || (u.mobile && u.mobile === identifier));
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const AppError = require('./utils/AppError');
const globalErrorHandler = require('./middleware/errorMiddleware');

// Handle Uncaught Exceptions (Synchronous errors)
// ✅ FIXED: Only log — do NOT exit. Exiting on every uncaught exception kills
// the server over routine request errors (e.g. bad ObjectId cast, missing header).
// Express's globalErrorHandler and catchAsync already catch route-level errors.
process.on('uncaughtException', err => {
  console.error('❌ UNCAUGHT EXCEPTION (non-fatal):', err.name, err.message);
  // Only exit on truly fatal startup errors (listen errors, etc.)
  if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
    console.error('Fatal port error — exiting.');
    process.exit(1);
  }
  // Otherwise: log and continue
});

const app = express();
// ─── Security Middlewares ─────────────────────────────────────────

// 1. Helmet for Security Headers with CSP for YouTube

// ─── CRITICAL: Trust Render's proxy — fixes ERR_ERL_UNEXPECTED_X_FORWARDED_FOR ─
app.set('trust proxy', 1);

// ─── 1. CORS — MUST be first, before all other middleware ────────────────────
const allowedOrigins = [
  "https://www.coursenova.in",
  "https://coursenova.in",
  "http://localhost:5000"
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (server-to-server, curl, Postman, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Do NOT throw an Error — silently reject with false to avoid 500 errors
      console.warn('[CORS] Blocked request from origin:', origin);
      callback(null, false);
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Handle preflight OPTIONS requests for all routes
app.options('*', cors(corsOptions));

// Apply CORS to all routes (only once)
app.use(cors(corsOptions));

// Global X-Robots-Tag middleware for Google Search Console indexing
app.use((req, res, next) => {
    res.setHeader("X-Robots-Tag", "index, follow");
    next();
});

// Force WWW and HTTPS Redirect Middleware (Production only)
app.use((req, res, next) => {
  const host = req.headers.host || '';
  
  // Bypass redirects for local development or native Render URLs to avoid development issues
  if (host.includes('localhost') || host.includes('render.com') || process.env.NODE_ENV !== 'production') {
      return next();
  }
  
  // 1. Force Redirect from Non-WWW to WWW
  if (!host.startsWith('www.')) {
      const targetHost = 'www.' + host;
      console.log(`[301 Redirect] WWW: Redirecting to https://${targetHost}${req.originalUrl}`);
      return res.redirect(301, `https://${targetHost}${req.originalUrl}`);
  }
  
  // 2. Force Redirect from HTTP to HTTPS
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  if (!isHttps) {
      console.log(`[301 Redirect] HTTPS: Redirecting to https://${host}${req.originalUrl}`);
      return res.redirect(301, `https://${host}${req.originalUrl}`);
  }
  
  next();
});

// ─── 2. Body Parsers ─────────────────────────────────────────────────────────
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf; // Specifically required for Cashfree Webhook Signature validation
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── 3. Security Middlewares ──────────────────────────────────────────────────

// Helmet for Security Headers with CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "frame-src": ["'self'", "https://www.youtube.com", "https://youtube.com", "https://docs.google.com", "https://drive.google.com", "https://sdk.cashfree.com", "https://sandbox.cashfree.com", "https://api.cashfree.com"],
      "img-src": ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://images.unsplash.com", "https://*.google.com", "https://*.googleusercontent.com", "https://i.ytimg.com", "https://yt3.ggpht.com", "https://ui-avatars.com", "https://cdni.iconscout.com"],
      "script-src": ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://*.google.com", "https://sdk.cashfree.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://cdn.socket.io"],
      "script-src-elem": ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://*.google.com", "https://sdk.cashfree.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://cdn.socket.io"],
      "script-src-attr": ["'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      "connect-src": ["'self'", "https://*.google-analytics.com", "https://*.analytics.google.com", "https://*.googletagmanager.com", "https://sdk.cashfree.com", "https://sandbox.cashfree.com", "https://api.cashfree.com", "https://www.coursenova.in", "wss://www.coursenova.in", "ws://*", "wss://*", "https://cdn.socket.io"],
      "form-action": ["'self'", "https://sdk.cashfree.com", "https://sandbox.cashfree.com", "https://api.cashfree.com"],
      "upgrade-insecure-requests": []
    },
  },
}));

// ─── Rate Limiting (requires trust proxy to be set above) ─────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs (increased for dev/restoration)
  message: { ok: false, message: "Too many requests from this IP, please try again after 15 minutes." },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    logSuspiciousActivity('Rate limit exceeded', req);
    res.status(options.statusCode).send(options.message);
  }
});

// Apply rate limiter to all API routes
app.use('/api/', apiLimiter);

// ─── XSS Protection — skip multipart/form-data (file uploads) ─────────────
app.use((req, res, next) => {
    const ct = req.headers['content-type'] || '';
    if (ct.startsWith('multipart/form-data')) return next();
    xss()(req, res, next);
});



// Express Session Middleware
app.use(session({
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Must be false for Local HTTP
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Explicit routes to ensure robots.txt and sitemap.xml are served with cache-prevention headers
app.get('/robots.txt', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

// Serve frontend static files from the specialized 'public' directory
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: 0, // Disable caching during restoration/development
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Main entry point
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Extensionless routes for key pages
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});
app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});
app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

// ✅ FIXED: Removed duplicate /auth/logout — logout is handled in routes/auth.js

// ─── JWT Authentication Middleware ──────────────────────────────
// Extracts JWT token from Authorization header and attaches user to request
app.use((req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        id: decoded.userId || decoded.id,
        email: decoded.email,
        name: decoded.name
      };
    } catch (err) {
      // Token is invalid, user will be null for this request
    }
  }
  next();
});

// ─── Professional Book Store Routes ──────────────────────────────
// Register all marketplace API routes
app.use('/api/books', booksRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/sellers', sellersRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/chats', chatsRoutes);

// ─── Store Routes (Private Book Exchange) ────────────────────
app.use('/api/store', storeRouter);

// ─── Used Books Marketplace Routes ───────────────────────────
app.use('/api/used-books', usedBooksRoutes);
app.use('/uploads/books', express.static(require('path').join(__dirname, 'uploads', 'books')));

// Handle Multer upload errors (e.g. file too large, wrong type)
app.use((err, req, res, next) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ ok: false, message: 'Image is too large. Max size is 5MB.' });
    }
    if (err && err.message === 'Only image files allowed') {
        return res.status(400).json({ ok: false, message: 'Only image files (JPG, PNG, WEBP) are allowed.' });
    }
    next(err);
});

// ─── Premium Course Routes ─────────────────────────────────────
app.use('/api/premium', require('./routes/premiumCourseRoutes'));

// ─── Course Platform Routes ───────────────────────────────────
app.use('/api/payments', paymentRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/course', courseRoutes);     // progress, access-check, submit-test, details
app.use('/api/enroll', enrollmentRoutes);    // Aligned with frontend expectation
app.use('/api/enrollments', enrollmentRoutes); // Standard plural alias
app.use('/api/my-courses', enrollmentRoutes); // Udemy-style alias
app.use('/api/test', require('./routes/testRoutes')); // New test endpoint

// ─── Practice & AI Routes (New) ──────────────────────────────
app.use('/api/practice', require('./routes/practice'));
app.use('/api/mocktest', require('./routes/mockTestRoutes'));
app.use('/api/ai', require('./routes/ai'));

// ─── Authentication Routes ───────────────────────────────────────────────────
// ✅ FIXED: All auth routes now under /api/auth — matches Google OAuth callbackURL
//   GET /api/auth/google          → triggers Google OAuth
//   GET /api/auth/google/callback → Google redirects here after login
//   GET /api/auth/me              → returns current authenticated user
//   GET /api/auth/logout          → logs out user
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
// Legacy aliases — keep /auth/google working for any existing links
app.use('/auth', authRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/user', userRoutes);
app.use('/api/profile', require('./routes/userRoutes')); // fulfilling legacy endpoint requirements

// ─── Community Routes ───────────────────────────────────────
app.use('/api/community', communityRoutes);
app.use('/api/community-ai', require('./routes/ai'));

// ─── Admin Panel Routes ───────────────────────────────────────
const adminRoutes = require('./routes/adminRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
app.use('/api/admin', adminRoutes);
app.use('/api/admin/daily-challenge', require('./routes/dailyChallengeAdmin'));
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);


// Serve uploaded screenshots and generated certificates as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/slides', express.static(path.join(__dirname, 'uploads', 'slides')));
app.use('/certificates', express.static(path.join(__dirname, 'certificates')));

// ─── Cashfree API Routes ──────────────────────────────────────────────
app.use('/api/cashfree', require('./routes/cashfree'));


// ────────────────────────────────────────────────────────────
// NOTE: Payment routes are now handled by routes/paymentRoutes.js
// Enrollment routes are handled by routes/enrollmentRoutes.js
// Certificate routes are handled by routes/certificateRoutes.js
// ────────────────────────────────────────────────────────────

// Google Auth Routes (Moved to routes/auth.js)
// Get current user (Moved to routes/auth.js)

// Simple endpoint to list users (PROTECTED: Admin/Dev only in theory, adding requireAuth for demo security)
app.get('/api/users', require('./middleware/auth').requireAuth, async (req, res) => {
  // Check if user is admin
  if (req.user && req.user.role !== 'admin') {
    logSuspiciousActivity('Unauthorized access attempt to /api/users', req);
    return res.status(403).json({ ok: false, message: 'Forbidden' });
  }
  const users = await StoreUser.find({});
  const safe = users.map(u => ({ id: u._id, fullName: u.name, email: u.email, role: u.role, picture: u.picture }));
  res.json(safe);
});

// ---------------- Seller verification (college email) ----------------
app.post('/api/request-verification', (req, res) => {
  const { userId, collegeEmail } = req.body;
  if (!userId || !collegeEmail) return res.status(400).json({ ok: false, message: 'userId and collegeEmail required' });
  const users = readUsers();
  const user = users.find(u => String(u.id) === String(userId));
  if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
  // generate a short token
  const token = Math.random().toString(36).slice(2, 10);
  user.collegeVerification = { collegeEmail, token, expiry: Date.now() + 24 * 60 * 60 * 1000 };
  writeUsers(users);
  // In production send verification email to collegeEmail with tokenized link
  console.log(`College verification link (mock): ${process.env.BASE_URL || 'https://www.coursenova.in'}/api/verify-college?token=${token}`);
  res.json({ ok: true, message: 'Verification email sent (mock). Check server console for link.' });
});

app.get('/api/verify-college', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Missing token');
  const users = readUsers();
  const user = users.find(u => u.collegeVerification && u.collegeVerification.token === token);
  if (!user) return res.status(404).send('Invalid or expired token');
  if (Date.now() > (user.collegeVerification.expiry || 0)) return res.status(400).send('Token expired');
  user.collegeVerified = true;
  user.college = user.collegeVerification.collegeEmail || user.college;
  user.collegeVerification = null;
  writeUsers(users);
  return res.send(`<html><body><h2>College email verified for ${user.fullName}</h2><p>You can now log in and list books as a verified seller.</p></body></html>`);
});

// ---------------- Simple chat message storage ----------------
const MESSAGES_FILE = path.join(__dirname, 'data', 'messages.json');
function readMessages() {
  try { return JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8') || '[]'); } catch (e) { return []; }
}
function writeMessages(msgs) { fs.writeFileSync(MESSAGES_FILE, JSON.stringify(msgs, null, 2), 'utf8'); }

// Get messages for a book
app.get('/api/messages', (req, res) => {
  const bookId = req.query.bookId;
  const msgs = readMessages();
  if (bookId) return res.json(msgs.filter(m => String(m.bookId) === String(bookId)));
  res.json(msgs);
});

// Post a message
app.post('/api/messages', (req, res) => {
  const { bookId, from, text } = req.body;
  if (!bookId || !text) return res.status(400).json({ ok: false, message: 'bookId and text required' });
  const msgs = readMessages();
  const msg = { id: Date.now(), bookId, from: from || 'Anonymous', text, ts: Date.now() };
  msgs.push(msg);
  writeMessages(msgs);
  res.json({ ok: true, message: 'Message saved', msg });
});

// ---------------- Content API ----------------
const CONTENT_FILE = path.join(__dirname, 'data', 'content.json');

function readContent() {
  try { return JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8') || '{}'); } catch (e) { return {}; }
}

app.get('/api/subjects', (req, res) => {
  const { classInfo } = req.query;
  const content = readContent();

  if (classInfo && content[classInfo]) {
    res.json({ ok: true, subjects: content[classInfo] });
  } else {
    // If no class or invalid class, return a default or all (for demo maybe just return empty or error, but let's return college as default)
    res.json({ ok: true, subjects: content['college'] || [] });
  }
});

// ---------------- Profile Update ----------------
app.post('/api/update-profile', async (req, res) => {
  try {
    const { userId, fullName, email, collegeName, department, year, childClass } = req.body;
    if (!userId) return res.status(400).json({ ok: false, message: 'User ID required' });

    const user = await StoreUser.findById(userId);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

    // Update fields if provided
    if (fullName) user.name = fullName;
    if (email) user.email = email;
    if (collegeName) user.collegeName = collegeName;
    if (department) user.department = department;
    if (year) user.year = year;
    if (childClass) user.childClass = childClass;

    await user.save();

    res.json({ ok: true, message: 'Profile updated', user: { id: user._id, fullName: user.name, email: user.email, role: user.role, college: user.collegeName } });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ ok: false, message: 'Server error updating profile' });
  }
});

const seedDailyChallenges = require('./scripts/seedDailyChallenges');
app.get('/api/seed-daily-challenges', async (req, res) => {
    try {
        await seedDailyChallenges();
        res.send("Seeding successful! Check your dashboard now.");
    } catch (err) {
        res.status(500).send("Seeding failed: " + err.message);
    }
});

// simple health check endpoint
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, message: 'pong' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Course progress, verification, test grading, and certificates
// are now handled by routes/courseRoutes.js (mounted at /api/course)
// Authentication is handled by middleware/auth.js
// ─────────────────────────────────────────────────────────────────────────────


// ─── Global Error Handling Middleware ───
// This MUST be the last middleware in the chain
// API-specific 404 handler
app.all('/api/*', (req, res, next) => {
  console.log(`[404 Error] ${req.method} ${req.originalUrl}`);
  next(new AppError(`API endpoint ${req.originalUrl} not found!`, 404));
});

app.use(globalErrorHandler);

// Catch-all route to serve the SPA (Standard Render/Deployment practice)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 5000;
const server = require('http').createServer(app);

// Handle Unhandled Rejections (Asynchronous errors)
// ✅ FIXED: Do NOT shut down the server on unhandled rejections.
// This was crashing the entire server every time a route threw an async error
// (e.g. Activity.create failing, a bad MongoDB query in a route handler).
// Express catchAsync + globalErrorHandler already deal with route-level errors.
process.on('unhandledRejection', err => {
  console.error('⚠️ UNHANDLED REJECTION (non-fatal, server continues):', err?.name, err?.message);
  // Intentionally NOT calling process.exit() — keep the server alive
});
const io = require('socket.io')(server, {
  cors: {
    origin: [
      "https://www.coursenova.in",
      "https://coursenova.in"
    ],
    methods: ["GET", "POST"]
  }
});
app.set('io', io);
global.io = io; // Set globally for cross-module notifications

// Community Chat & Real-Time Dashboard Logic (Socket.io)
const socketMap = new Map(); // userId -> Set of socketIds

const CommunityChat = require('./models/CommunityChat');

io.on('connection', (socket) => {
  console.log('⚡ New Socket Connection:', socket.id);

  // Unified Identification for Dashboard/Chat
  socket.on('identify', (userId) => {
    if (!userId) return;
    const cleanUserId = String(userId).replace(/['"]+/g, '');
    socket.userId = cleanUserId;
    socket.join(`user:${cleanUserId}`);
    console.log(`👤 User Verified: ${cleanUserId} | Joined Room: user:${cleanUserId}`);
  });

  socket.on('join-room', async (roomId) => {
    socket.join(roomId);
    console.log(`📡 Socket ${socket.id} joined channel: ${roomId}`);
    
    // Fetch last 50 messages from DB
    try {
        const chat = await CommunityChat.findOne({ roomId });
        if (chat) {
            socket.emit('chat-history', chat.messages.slice(-50));
        } else {
            // Initialize room if it doesn't exist (group rooms)
            const globalRooms = ['JEE', 'NEET', 'Coding', 'General'];
            if (globalRooms.includes(roomId)) {
                await CommunityChat.create({ roomId, type: 'group' });
            }
        }
    } catch (err) {
        console.error('Chat history error:', err);
    }
  });

  socket.on('send-message', async (data) => {
    // data: { roomId, senderId, senderName, senderPicture, text }
    const { roomId, senderId, senderName, senderPicture, text } = data;
    
    try {
        // Save to DB
        await CommunityChat.findOneAndUpdate(
            { roomId },
            { 
                $push: { messages: { senderId, senderName, senderPicture, text } },
                lastMessage: text,
                lastMessageTime: new Date()
            },
            { upsert: true }
        );

        // Broadcast to room
        io.to(roomId).emit('receive-message', {
            senderId, senderName, senderPicture, text, timestamp: new Date()
        });
    } catch (err) {
        console.error('Message save error:', err);
    }
  });

  socket.on('typing', (data) => {
      // data: { roomId, username, isTyping }
      socket.to(data.roomId).emit('user-typing', data);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket Disconnected:', socket.id);
  });
});

// Attach socketMap to app for use in routes
app.set('socketMap', socketMap);

server.listen(PORT, () => {
    console.log(`[${new Date().toLocaleTimeString()}] COURSENOVA Community API & Chat listening on port ${PORT}`);
});

