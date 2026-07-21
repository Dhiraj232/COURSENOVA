console.log("=================================");
console.log("Starting CourseNova Server...");
console.log("Loading Environment...");
require('dotenv').config();

// Global Exception Handlers defined at the very top to protect imports and startup sequence
process.on("uncaughtException",(err)=>{
    console.error(err);
});

process.on("unhandledRejection",(err)=>{
    console.error(err);
});

// Required Environment Validation
const requiredEnv = ['MONGO_URI', 'JWT_SECRET', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'];
requiredEnv.forEach(envVar => {
  if (!process.env[envVar]) {
    console.warn(`⚠️ WARNING: Required environment variable ${envVar} is missing!`);
  }
});

console.log("Initializing Express...");
const express = require('express');
const compression = require('compression');
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
const mongoSanitize = require('express-mongo-sanitize');
let logSuspiciousActivity, paymentLimiter, preventInjection;
try {
  const security = require('./middleware/security');
  logSuspiciousActivity = security.logSuspiciousActivity;
  paymentLimiter = security.paymentLimiter;
  preventInjection = security.preventInjection;
} catch (err) {
  console.error('❌ Failed to load security middleware:', err.message);
  logSuspiciousActivity = (req, res, next) => next();
  paymentLimiter = (req, res, next) => next();
  preventInjection = (req, res, next) => next();
}

let notificationService;
try {
  notificationService = require('./services/notificationService');
} catch (err) {
  console.error('❌ Failed to load notification service:', err.message);
}

const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

console.log("Loading Routes...");
// ─── Store & Marketplace Routers (MongoDB-backed) ──────────────
let storeRouter, booksRoutes, ordersRoutes, cartRoutes, sellersRoutes, reviewsRoutes, wishlistRoutes, chatsRoutes, usedBooksRoutes;
let paymentRoutes, enrollmentRoutes, certificateRoutes, courseRoutes, coursesRoutes, communityRoutes, dashboardRoutes, razorpayRoutes;

try { storeRouter = require('./routes/store'); } catch (err) { console.error('❌ Failed to load store routes:', err.message); }
try { booksRoutes = require('./routes/booksRoutes'); } catch (err) { console.error('❌ Failed to load books routes:', err.message); }
try { ordersRoutes = require('./routes/ordersRoutes'); } catch (err) { console.error('❌ Failed to load orders routes:', err.message); }
try { cartRoutes = require('./routes/cartRoutes'); } catch (err) { console.error('❌ Failed to load cart routes:', err.message); }
try { sellersRoutes = require('./routes/sellersRoutes'); } catch (err) { console.error('❌ Failed to load sellers routes:', err.message); }
try { reviewsRoutes = require('./routes/reviewsRoutes'); } catch (err) { console.error('❌ Failed to load reviews routes:', err.message); }
try { wishlistRoutes = require('./routes/wishlistRoutes'); } catch (err) { console.error('❌ Failed to load wishlist routes:', err.message); }
try { chatsRoutes = require('./routes/chatsRoutes'); } catch (err) { console.error('❌ Failed to load chats routes:', err.message); }
try { usedBooksRoutes = require('./routes/usedBooksRoutes'); } catch (err) { console.error('❌ Failed to load usedBooks routes:', err.message); }
try { paymentRoutes = require('./routes/paymentRoutes'); } catch (err) { console.error('❌ Failed to load payment routes:', err.message); }
try { enrollmentRoutes = require('./routes/enrollmentRoutes'); } catch (err) { console.error('❌ Failed to load enrollment routes:', err.message); }
try { certificateRoutes = require('./routes/certificateRoutes'); } catch (err) { console.error('❌ Failed to load certificate routes:', err.message); }
try { courseRoutes = require('./routes/courseRoutes'); } catch (err) { console.error('❌ Failed to load course routes:', err.message); }
try { coursesRoutes = require('./routes/courses'); } catch (err) { console.error('❌ Failed to load courses routes:', err.message); }
try { communityRoutes = require('./routes/community'); } catch (err) { console.error('❌ Failed to load community routes:', err.message); }
try { dashboardRoutes = require('./routes/dashboardRoutes'); } catch (err) { console.error('❌ Failed to load dashboard routes:', err.message); }
try { razorpayRoutes = require('./routes/razorpayRoutes'); } catch (err) { console.error('❌ Failed to load razorpay routes:', err.message); }

// ─── Environment Configuration Setup ────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';

console.log("Connecting MongoDB...");
// ─── MongoDB Connection (Asynchronous, Non-Blocking) ───────────
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ CRITICAL ERROR: MONGO_URI is missing! Server will run but DB calls will fail.');
} else {
  mongoose.connect(MONGO_URI, {
      maxPoolSize: 20,              // Keep up to 20 connections open in pool
      minPoolSize: 5,               // Always maintain at least 5 connections
      socketTimeoutMS: 45000,       // Close sockets after 45s of inactivity
      serverSelectionTimeoutMS: 5000, // Timeout after 5s if replica set is down
      family: 4                     // Force IPv4 to skip potential DNS lags
  })
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => {
        console.error('❌ MongoDB Connection Failed:', err.message);
    });
}

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
        // Send welcome email (non-blocking)
        try {
          const emailService = require('./services/emailService');
          emailService.sendWelcomeEmail(user).catch(() => {});
        } catch(e) {}
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
const app = express();

console.log("Health Endpoint Ready...");
// Lightweight Health Endpoint defined before any other middleware or routes
app.get("/health",(req,res)=>{
    res.status(200).json({
        status:"ok",
        uptime:process.uptime(),
        timestamp:new Date()
    });
});

app.use(compression());
// Global Permissions-Policy header
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  next();
});
// ─── Security Middlewares ─────────────────────────────────────────

// 1. Helmet for Security Headers with CSP for YouTube

// ─── CRITICAL: Trust Render's proxy — fixes ERR_ERL_UNEXPECTED_X_FORWARDED_FOR ─
app.set('trust proxy', 1);

// ─── 1. CORS — MUST be first, before all other middleware ────────────────────
const allowedOrigins = [
  "https://www.coursenova.in",
  "https://coursenova.in",
  "http://localhost:5000",
  "http://127.0.0.1:5000"
];
if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
if (process.env.BASE_URL) allowedOrigins.push(process.env.BASE_URL.replace(/\/$/, ''));


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

// Global X-Robots-Tag middleware for Google Search Console indexing (pages only)
app.use((req, res, next) => {
  const pathLower = req.path.toLowerCase();
  // Exclude configuration files, assets, and API routes from indexation headers
  const excludedExtensions = ['.txt', '.xml', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.css', '.js', '.woff', '.woff2', '.ttf', '.eot', '.webp', '.avif', '.json', '.webmanifest'];
  const isExcluded = excludedExtensions.some(ext => pathLower.endsWith(ext)) || pathLower.startsWith('/api/');
  
  if (!isExcluded) {
      res.setHeader("X-Robots-Tag", "index, follow");
  }
  next();
});

// Force WWW and HTTPS Redirect Middleware (Production only)
app.use((req, res, next) => {
  const host = req.headers.host || '';
  
  // Bypass redirects for local development or native Render URLs to avoid development issues
  if (host.includes('localhost') || host.includes('render.com') || process.env.NODE_ENV !== 'production') {
      return next();
  }

  // Skip redirects for API and Auth routes to prevent changing POST requests to GET
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
      return next();
  }
  
  // 1. Force Redirect from Non-WWW to WWW (Only for the official domain)
  if (host.includes('coursenova.in') && !host.startsWith('www.')) {
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

// Force Trailing Slash Removal Middleware (e.g. /about/ -> /about) to prevent duplicate content
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    if (req.path.length > 1 && req.path.endsWith('/')) {
      const cleanPath = req.path.slice(0, -1);
      const query = req.url.slice(req.path.length);
      console.log(`[301 Redirect] Trailing Slash: Redirecting ${req.originalUrl} to ${cleanPath}${query}`);
      return res.redirect(301, cleanPath + query);
    }
  }
  next();
});

// High-performance routes for robots.txt & sitemap.xml (defined early to bypass sessions/helmet)
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



// ─── 2. Body Parsers ─────────────────────────────────────────────────────────
app.use(express.json({ 
  limit: '500mb',
  verify: (req, res, buf) => {
    req.rawBody = buf; // Specifically required for Webhook Signature validation (Razorpay)
  }
}));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// ─── 3. Security Middlewares ──────────────────────────────────────────────────

// Helmet for Security Headers with CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "frame-src": ["'self'", "https://www.youtube.com", "https://youtube.com", "https://docs.google.com", "https://drive.google.com", "https://api.razorpay.com", "https://checkout.razorpay.com", "https://otpless.com", "https://www.google.com", "https://maps.google.com"],
      "img-src": ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://images.unsplash.com", "https://*.google.com", "https://*.googleusercontent.com", "https://i.ytimg.com", "https://yt3.ggpht.com", "https://ui-avatars.com", "https://cdni.iconscout.com", "https://*.clarity.ms", "https://c.bing.com", "https://*.bing.com"],
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.googletagmanager.com", "https://*.google-analytics.com", "https://*.google.com", "https://checkout.razorpay.com", "https://api.razorpay.com", "https://*.razorpay.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://cdn.socket.io", "https://www.clarity.ms", "https://*.clarity.ms", "https://static.cloudflareinsights.com"],
      "script-src-elem": ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://*.google-analytics.com", "https://*.google.com", "https://checkout.razorpay.com", "https://api.razorpay.com", "https://*.razorpay.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://cdn.socket.io", "https://www.clarity.ms", "https://*.clarity.ms", "https://static.cloudflareinsights.com"],
      "script-src-attr": ["'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      "font-src": ["'self'", "data:", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      "connect-src": ["'self'", "https://*.google-analytics.com", "https://*.analytics.google.com", "https://*.googletagmanager.com", "https://translate.googleapis.com", "https://api.razorpay.com", "https://*.razorpay.com", "https://www.coursenova.in", "https://coursenova.in", "wss://www.coursenova.in", "wss://coursenova.in", "ws://*", "wss://*", "https://cdn.jsdelivr.net", "https://cdn.socket.io", "https://*.clarity.ms", "https://c.bing.com", "https://*.bing.com", "https://static.cloudflareinsights.com"],
      "form-action": ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com", "https://*.razorpay.com"],
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

// Apply rate limiter and injection prevention to all API routes
app.use('/api/', apiLimiter);
app.use('/api/', preventInjection);

// ─── XSS Protection — skip multipart/form-data (file uploads) ─────────────
app.use((req, res, next) => {
    const ct = req.headers['content-type'] || '';
    if (ct.startsWith('multipart/form-data')) return next();
    xss()(req, res, next);
});

// ─── NoSQL Injection Sanitization ────────────────────────────────────────────
// Strips MongoDB operators ($eq, $gt, etc.) from req.body, req.query, req.params
app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        logSuspiciousActivity(`NoSQL injection attempt in field: ${key}`, req);
    }
}));



// Express Session Middleware
app.use(session({
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'cn.sid', // Non-default cookie name to avoid fingerprinting
  cookie: {
    secure: isProduction, // HTTPS-only in production, allow HTTP locally
    httpOnly: true,       // Prevents client-side JS access to cookie
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Note: robots.txt and sitemap.xml routes have been moved to the top of the middleware chain for optimization

// 1. Serve .html pages DIRECTLY (do NOT redirect to extensionless).
// Rationale: a 301 redirect strips the browser cache and may not preserve query
// params correctly under all CDN/Nginx configs, leading to ERR_FAILED loops.
// The explicit publicPages routes above (registered after this middleware) handle
// canonical extensionless URLs; this middleware is the last safety net.
app.use((req, res, next) => {
    if ((req.method === 'GET' || req.method === 'HEAD') && req.path.endsWith('.html')) {
        // Special case: /index.html → /
        if (req.path === '/index.html') {
            return res.redirect(301, '/' + req.url.slice(req.path.length));
        }
        // Serve the file directly (query params are forwarded automatically via sendFile)
        const filePath = path.join(__dirname, 'public', req.path);
        if (fs.existsSync(filePath)) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            return res.sendFile(filePath);
        }
    }
    next();
});


// 2. Serve HTML files extensionless (e.g. /about -> about.html)
app.use((req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
        let cleanPath = req.path;
        if (cleanPath.endsWith('/') && cleanPath.length > 1) {
            cleanPath = cleanPath.slice(0, -1);
        }
        if (path.extname(cleanPath)) {
            return next();
        }
        if (cleanPath.startsWith('/api/')) {
            return next();
        }
        const filePath = path.join(__dirname, 'public', cleanPath + '.html');
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (!err) {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
                return res.sendFile(filePath);
            }
            next();
        });
    } else {
        next();
    }
});

// Serve frontend static files from the specialized 'public' directory
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html', 'htm'],
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    
    // HTML files, robots.txt, and sitemap.xml should NEVER be cached
    if (ext === '.html' || filePath.endsWith('robots.txt') || filePath.endsWith('sitemap.xml')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (process.env.NODE_ENV === 'production') {
      // Long-term caching for static assets in production (1 year)
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      // Disable caching for development
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

// ─── Extensionless routes for ALL public pages ───────────────────────────────
// Both /page and /page.html are served. This ensures direct URL access, browser
// refresh, and query parameters (e.g. ?course=xyz) all work without 404/ERR_FAILED.
const publicPages = [
  'index',
  'dashboard',
  'signup',
  'profile',
  'certificates',
  'course-content',
  'course-test',
  'my-courses',
  'mock-tests',
  'mock-test-hub',
  'mock-test-result',
  'testing-center',
  'community',
  'store',
  'cart',
  'checkout',
  'payment',
  'orders',
  'my-certificates',
  'verify-certificate',
  'view-certificate',
  'about',
  'family',
  'book-detail',
  'seller-profile',
  'quiz-engine',
  'quiz-results',
  'test-player',
  'daily-challenge',
  'daily-challenge-history',
  'daily-challenge-taker',
  'cgpa-calculator',
  'board-selector',
  'auth-callback',
  'admin-dashboard',
  'admin-login',
  'admin-payments',
  'admin-daily-challenge',
  'privacy-policy',
  'terms-and-conditions',
  'offline',
  '404',
];

publicPages.forEach(page => {
  const filePath = path.join(__dirname, 'public', `${page}.html`);
  // Only register if file exists (avoid registering routes for non-existent files)
  if (fs.existsSync(filePath)) {
    // /page-name (extensionless, canonical)
    app.get(`/${page}`, (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(filePath);
    });
    // /page-name.html (with extension — no redirect; serve directly to avoid ERR_FAILED loops)
    app.get(`/${page}.html`, (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(filePath);
    });
  }
});

// ─── Backward-compatible aliases ─────────────────────────────────────────────
// /login and /login.html → /signup (since no standalone login.html exists)
app.get(['/login', '/login.html'], (req, res) => {
  res.redirect(301, '/signup');
});
// /courses and /courses.html → /certificates (since no courses.html exists)
app.get(['/courses', '/courses.html'], (req, res) => {
  res.redirect(301, '/certificates');
});


// ✅ FIXED: Removed duplicate /auth/logout — logout is handled in routes/auth.js

// ─── JWT Authentication Middleware ──────────────────────────────
// Extracts JWT token from Authorization header and attaches user to request
app.use((req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const tokenBlacklist = require('./services/tokenBlacklist');
      if (tokenBlacklist.isBlacklisted(token)) {
        return next(); // Ignore blacklisted token (treat as unauthenticated)
      }
      
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
if (booksRoutes) app.use('/api/books', booksRoutes);
if (ordersRoutes) app.use('/api/orders', ordersRoutes);
if (cartRoutes) app.use('/api/cart', cartRoutes);
try { app.use('/api/feedback', require('./routes/feedbackRoutes')); } catch (err) { console.error('❌ Feedback routes mount failed:', err.message); }
if (sellersRoutes) app.use('/api/sellers', sellersRoutes);
if (reviewsRoutes) app.use('/api/reviews', reviewsRoutes);
if (wishlistRoutes) app.use('/api/wishlist', wishlistRoutes);
if (chatsRoutes) app.use('/api/chats', chatsRoutes);

// ─── Store Routes (Private Book Exchange) ────────────────────
if (storeRouter) app.use('/api/store', storeRouter);

// ─── Used Books Marketplace Routes ───────────────────────────
if (usedBooksRoutes) app.use('/api/used-books', usedBooksRoutes);
app.use('/uploads/books', express.static(require('path').join(__dirname, 'uploads', 'books'), {
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  }
}));

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
let premiumCourseRoutes;
try { premiumCourseRoutes = require('./routes/premiumCourseRoutes'); } catch (err) { console.error('❌ Failed to load premiumCourseRoutes:', err.message); }
if (premiumCourseRoutes) app.use('/api/premium', premiumCourseRoutes);
if (coursesRoutes) app.use('/api/courses', coursesRoutes);
if (paymentRoutes) app.use('/api/payments', paymentRoutes);
if (enrollmentRoutes) app.use('/api/enrollments', enrollmentRoutes);
if (certificateRoutes) app.use('/api/certificates', certificateRoutes);
if (courseRoutes) app.use('/api/course', courseRoutes);     // progress, access-check, submit-test, details
if (enrollmentRoutes) app.use('/api/enroll', enrollmentRoutes);    // Aligned with frontend expectation
if (enrollmentRoutes) app.use('/api/enrollments', enrollmentRoutes); // Standard plural alias
if (enrollmentRoutes) app.use('/api/my-courses', enrollmentRoutes); // Udemy-style alias
try { app.use('/api/test', require('./routes/testRoutes')); } catch (err) { console.error('❌ Test routes mount failed:', err.message); }

try { app.use('/api/mocktest', require('./routes/mockTestRoutes')); } catch (err) { console.error('❌ Mocktest routes mount failed:', err.message); }
try { app.use('/api/ai', require('./routes/ai')); } catch (err) { console.error('❌ AI routes mount failed:', err.message); }

// ─── Authentication Routes ───────────────────────────────────────────────────
//   GET /api/auth/google          → triggers Google OAuth
//   GET /api/auth/google/callback → Google redirects here after login
//   GET /api/auth/me              → returns current authenticated user
//   GET /api/auth/logout          → logs out user
let authRoutes;
try { authRoutes = require('./routes/auth'); } catch (err) { console.error('❌ Failed to load authRoutes:', err.message); }
if (authRoutes) {
  app.use('/api/auth', authRoutes);
  app.use('/auth', authRoutes);
}

let userRoutes;
try { userRoutes = require('./routes/userRoutes'); } catch (err) { console.error('❌ Failed to load userRoutes:', err.message); }
if (userRoutes) {
  app.use('/api/user', userRoutes);
  try { app.use('/api/profile', require('./routes/userRoutes')); } catch (err) {}
}

// ─── Community Routes ───────────────────────────────────────
if (communityRoutes) app.use('/api/community', communityRoutes);
try { app.use('/api/community-ai', require('./routes/ai')); } catch (err) { console.error('❌ Community AI routes mount failed:', err.message); }

// ─── Admin Panel Routes ───────────────────────────────────────
let adminRoutes, analyticsRoutes;
try { adminRoutes = require('./routes/adminRoutes'); } catch (err) { console.error('❌ Failed to load adminRoutes:', err.message); }
try { analyticsRoutes = require('./routes/analyticsRoutes'); } catch (err) { console.error('❌ Failed to load analyticsRoutes:', err.message); }
if (adminRoutes) app.use('/api/admin', adminRoutes);
try { app.use('/api/admin/daily-challenge', require('./routes/dailyChallengeAdmin')); } catch (err) { console.error('❌ Daily challenge admin routes mount failed:', err.message); }
if (analyticsRoutes) app.use('/api/analytics', analyticsRoutes);
if (dashboardRoutes) app.use('/api/dashboard', dashboardRoutes);

// ─── Notification Routes ───────────────────────────────────────
try { app.use('/api/notifications', require('./routes/notificationRoutes')); } catch (err) { console.error('❌ Notification routes mount failed:', err.message); }

// ─── Referral Routes ───────────────────────────────────────────
try { app.use('/api/referral', require('./routes/referralRoutes')); } catch (err) { console.error('❌ Referral routes mount failed:', err.message); }



// Serve uploaded screenshots and generated certificates as static files with caching
const staticCacheOptions = {
  maxAge: '7d', // 7 days cache
  setHeaders: (res, filePath) => {
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  }
};
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), staticCacheOptions));
app.use('/uploads/slides', express.static(path.join(__dirname, 'uploads', 'slides'), staticCacheOptions));
app.use('/certificates', express.static(path.join(__dirname, 'certificates'), staticCacheOptions));

// ─── Razorpay API Routes (Payment-rate-limited) ──────────────────────────────
try {
  app.use('/api/razorpay', paymentLimiter, razorpayRoutes);
} catch (err) {
  console.error('❌ Razorpay routes mount failed:', err.message);
}


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

// Post a message — requires authentication to prevent spam
app.post('/api/messages', require('./middleware/auth').requireAuth, (req, res) => {
  const { bookId, from, text } = req.body;
  if (!bookId || !text) return res.status(400).json({ ok: false, message: 'bookId and text required' });
  // Use authenticated user's name if available
  const senderName = req.user?.name || from || 'Anonymous';
  const msgs = readMessages();
  const msg = { id: Date.now(), bookId, from: senderName, text, ts: Date.now() };
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

// ---------------- Profile Update (Authenticated) ----------------
app.post('/api/update-profile', require('./middleware/auth').requireAuth, async (req, res) => {
  try {
    const { fullName, email, collegeName, department, year, childClass } = req.body;
    // Use the authenticated user's ID from the JWT token — prevents IDOR attacks
    const userId = req.userId || req.user?.id;
    if (!userId) return res.status(401).json({ ok: false, message: 'Authentication required' });

    const user = await StoreUser.findById(userId);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

    // Update only allowed fields
    if (fullName) user.name = fullName.slice(0, 100); // Limit length
    if (email) user.email = email.toLowerCase().slice(0, 150);
    if (collegeName) user.collegeName = collegeName.slice(0, 200);
    if (department) user.department = department.slice(0, 100);
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
// ⚠️ Admin-only: Seed endpoint is protected by requireAdmin
app.get('/api/seed-daily-challenges', require('./middleware/auth').requireAdmin, async (req, res) => {
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

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Listening on PORT ${PORT}`);
    console.log("Server Started Successfully");
    console.log("=================================");

    // Set server timeout to 5 minutes to accommodate large PDF uploads and background saves
    server.timeout = 300000;

    // ─── Asynchronous Seeding Tasks (Non-blocking) ─────────────────────────────
    (async () => {
        try {
            await seedDailyChallenges();
            console.log("Daily Challenges seeded successfully.");
        } catch (err) {
            console.error("Daily Challenge seed failed:", err);
        }
    })();

    // ─── Initialize Notification Schedulers after DB connection settles ────────
    setTimeout(() => {
        try {
            const { initScheduler } = require('./services/schedulerService');
            initScheduler();
        } catch (err) {
            console.warn('[Scheduler] Failed to initialize:', err.message);
        }
    }, 5000); // 5s delay ensures MongoDB is fully connected

    // ─── Self-Ping Keep-Alive (prevents Render free tier from sleeping) ────────
    // Pings /health every 13 minutes to keep the server warm for Googlebot crawls.
    // Render free tier sleeps after 15 min of inactivity — this prevents that.
    if (process.env.NODE_ENV === 'production') {
        const KEEP_ALIVE_URL = process.env.RENDER_EXTERNAL_URL
            ? `${process.env.RENDER_EXTERNAL_URL}/health`
            : 'https://www.coursenova.in/health';
        const INTERVAL_MS = 13 * 60 * 1000; // 13 minutes

        setInterval(() => {
            const https = require('https');
            https.get(KEEP_ALIVE_URL, (res) => {
                console.log(`[Keep-Alive] Pinged ${KEEP_ALIVE_URL} → ${res.statusCode}`);
            }).on('error', (err) => {
                console.warn(`[Keep-Alive] Ping failed: ${err.message}`);
            });
        }, INTERVAL_MS);

        console.log(`[Keep-Alive] Self-ping enabled every 13 min → ${KEEP_ALIVE_URL}`);
    }
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

  socket.on('disconnect', () => {
    console.log('🔌 Socket Disconnected:', socket.id);
  });
});

// Attach socketMap to app for use in routes
app.set('socketMap', socketMap);
