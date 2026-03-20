const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { OAuth2Client } = require('google-auth-library');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const { logSuspiciousActivity } = require('./middleware/security');

// Load environment variables
require('dotenv').config();

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

// ─── Environment Configuration Setup ────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.MONGO_URI) console.warn('⚠️ MONGO_URI is missing.');
if (!process.env.GOOGLE_CLIENT_ID) console.warn('⚠️ GOOGLE_CLIENT_ID is missing. Google OAuth will fail.');
if (!process.env.GOOGLE_CLIENT_SECRET) console.warn('⚠️ GOOGLE_CLIENT_SECRET is missing. Google OAuth will fail.');
if (!process.env.JWT_SECRET) console.warn('⚠️ JWT_SECRET is missing. Using insecure fallback secret.');
if (!process.env.BASE_URL) console.warn('⚠️ BASE_URL is missing. OAuth redirects will use localhost:5000.');

// ─── MongoDB Connection ───────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ CRITICAL ERROR: MONGO_URI missing! Exiting...');
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
  callbackURL: (process.env.BASE_URL || "http://localhost:5000") + "/auth/google/callback",
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
process.on('uncaughtException', err => {
  console.error('❌ UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

const app = express();

// ─── 1. CORS — MUST be first, before all other middleware ────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://renvox.in",
  "https://www.renvox.in",
  "https://lms-backend-renvox.onrender.com",
  "https://renvox-ai.onrender.com"
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (server-to-server, curl, Postman, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: origin ' + origin + ' is not allowed'));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Handle preflight OPTIONS requests for all routes
app.options('*', cors(corsOptions));

// Apply CORS to all routes
app.use(cors(corsOptions));

// ─── 2. Body Parsers ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── 3. Security Middlewares ──────────────────────────────────────────────────

// Helmet for Security Headers with CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "frame-src": ["'self'", "https://www.youtube.com", "https://youtube.com", "https://api.razorpay.com", "https://docs.google.com"],
      "img-src": ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://images.unsplash.com", "https://*.google.com", "https://*.googleusercontent.com", "https://i.ytimg.com", "https://yt3.ggpht.com", "https://ui-avatars.com", "https://cdni.iconscout.com"],
      "script-src": ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://*.google.com", "https://checkout.razorpay.com"],
      "script-src-attr": ["'unsafe-inline'"],
      "connect-src": ["'self'", "https://*.google-analytics.com", "https://*.analytics.google.com", "https://*.googletagmanager.com", "https://api.razorpay.com", "https://lms-backend-renvox.onrender.com", "https://renvox-ai.onrender.com"]
    },
  },
}));

// Rate Limiting to prevent API abuse/DoS
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: { ok: false, message: "Too many requests from this IP, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logSuspiciousActivity('Rate limit exceeded', req);
    res.status(options.statusCode).send(options.message);
  }
});

// Apply rate limiter to all API routes
app.use('/api/', apiLimiter);

// XSS Protection — skip multipart/form-data (file uploads) to avoid corrupting them
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
  cookie: { secure: false } // Set to true if using HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

// Serve frontend static files from the specialized 'public' directory
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1y',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Main entry point
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Authentication Routes ──────────────────────────────
app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ ok: false, message: 'Logout failed' });
    res.json({ ok: true, message: 'Logged out successfully' });
  });
});

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

// ─── Course Platform Routes ───────────────────────────────────
app.use('/api/payments', paymentRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/course', courseRoutes);     // progress, access-check, submit-test, details
app.use('/api/my-courses', enrollmentRoutes); // Udemy-style alias → GET /api/my-courses/my-courses
app.use('/api/test', require('./routes/testRoutes')); // New test endpoint

// ─── Practice & AI Routes (New) ──────────────────────────────
app.use('/api/practice', require('./routes/practice'));
app.use('/api/mocktest', require('./routes/mockTestRoutes'));
app.use('/api/ai', require('./routes/ai'));

// ─── Authentication Routes ───────────────────────────
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);
app.use('/api', authRoutes); // also mount under /api for /api/me consistency
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
app.use('/api/analytics', analyticsRoutes);


// Serve uploaded screenshots and generated certificates as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/certificates', express.static(path.join(__dirname, 'certificates')));

// Razorpay Instance (Test Keys)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_TYYvG5LdO0V12j',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'tK0lWjAOr3mR0K9uI3uSqkZ1'
});

// Create Order API
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, course } = req.body;
    if (!amount) return res.status(400).json({ ok: false, message: 'Amount is required' });

    const options = {
      amount: amount * 100, // amount in smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    res.json({ ok: true, orderId: order.id, amount: order.amount, currency: order.currency, course });
  } catch (error) {
    console.error('Razorpay Create Order Error:', error);
    res.status(500).json({ ok: false, message: 'Failed to create order' });
  }
});

// Verify Payment API and Enroll User
app.post('/api/verify-payment', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ ok: false, message: 'Login required' });

  let userId;
  try {
    userId = jwt.verify(token, JWT_SECRET).userId;
  } catch (e) {
    return res.status(401).json({ ok: false, message: 'Invalid token' });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, course } = req.body;

  const secret = process.env.RAZORPAY_KEY_SECRET || 'tK0lWjAOr3mR0K9uI3uSqkZ1';
  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body.toString())
    .digest('hex');

  const isAuthentic = expectedSignature === razorpay_signature;

  if (isAuthentic) {
    try {
      if (course) {
        // 1. Update User.enrolledCourses (legacy quick lookup)
        const user = await StoreUser.findById(userId);
        if (user && !user.enrolledCourses.includes(course)) {
          user.enrolledCourses.push(course);
          await user.save();
        }

        // 2. Create/upsert Enrollment record (permanent DB record used by my-courses.html)
        const Enrollment = require('./models/Enrollment');
        await Enrollment.findOneAndUpdate(
          { userId: String(userId), courseId: course },
          { userId: String(userId), courseId: course, courseName: course, purchaseDate: new Date() },
          { upsert: true, new: true }
        );

        // 3. Save Transaction record for Profile Dashboard
        const Transaction = require('./models/Transaction');
        await Transaction.create({
          userId: userId,
          courseId: course,
          courseName: course, // If you have course object title use it, otherwise fallback
          amount: req.body.amount || 0, // ensure you pass amount/course from frontend
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          status: 'success'
        });

        // ── ACTIVITY LOGGING ──
        const Activity = require('./models/Activity');
        try {
          await Activity.create({
            userId,
            type: 'course_enrolled',
            title: `Enrolled: ${course}`,
            description: `Purchased and unlocked "${course}" access.`,
            courseId: course,
            courseName: course
          });
        } catch (logErr) {
          console.warn('Silent Paid Log Error:', logErr);
        }

        console.log(`Enrolled ${user ? user.email : userId} in "${course}" via Razorpay.`);
      }

      res.json({ ok: true, message: 'Payment verified successfully and user enrolled.' });
    } catch (err) {
      console.error('Database Error during enrollment:', err);
      res.status(500).json({ ok: false, message: 'Payment verified, but failed to save enrollment.' });
    }
  } else {
    res.status(400).json({ ok: false, message: 'Invalid payment signature' });
  }
});

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
  console.log(`College verification link (mock): http://localhost:${PORT || 4000}/api/verify-college?token=${token}`);
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
  next(new AppError(`API endpoint ${req.originalUrl} not found!`, 404));
});

app.use(globalErrorHandler);

// Catch-all route to serve the SPA (Standard Render/Deployment practice)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
const server = require('http').createServer(app);

// Handle Unhandled Rejections (Asynchronous errors)
process.on('unhandledRejection', err => {
  console.error('❌ UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
const io = require('socket.io')(server, {
  cors: {
    origin: [
      "http://localhost:3000", 
      "http://127.0.0.1:3000", 
      "http://localhost:5500", 
      "http://127.0.0.1:5500",
      "https://renvox.in",
      "https://www.renvox.in",
      "https://lms-backend-renvox.onrender.com",
      "https://renvox-ai.onrender.com" // Just in case
    ],
    methods: ["GET", "POST"]
  }
});
app.set('io', io);

// Community Chat Logic (Socket.io)
io.on('connection', (socket) => {
  console.log('User connected to chat');

  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`User joined channel: ${room}`);
  });

  socket.on('send-message', (data) => {
    // data: { room, sender, text, avatar, ts }
    io.to(data.room).emit('receive-message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(PORT, () => console.log('RENVOX Community API & Chat listening on port', PORT));

