const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { OAuth2Client } = require('google-auth-library');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config();

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

// ─── MongoDB Connection ───────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/renvox-bookstore';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected:', MONGO_URI.split('@').pop() || MONGO_URI))
  .catch(err => console.error('❌ MongoDB connection error:', err.message, '\n   Set MONGO_URI env var or start MongoDB locally.'));

const DATA_FILE = path.join(__dirname, 'data', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
// Google OAuth client ID used for server‑side token verification.  It
// can be injected via the GOOGLE_CLIENT_ID environment variable.  If you
// regenerate the client in Google Cloud Console, update the env var or
// change the default below.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ||
  '1055845988581-m0ki9b0d30iohsmk70go6fikntg65eac.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const StoreUser = require('./models/User');
const CourseProgress = require('./models/CourseProgress');

passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:5000/auth/google/callback"
},
  async function (accessToken, refreshToken, profile, done) {
    try {
      let user = await StoreUser.findOne({ googleId: profile.id });
      if (!user) {
        user = new StoreUser({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails && profile.emails.length > 0 ? profile.emails[0].value : '',
          picture: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : '',
          role: 'college',
          lastLogin: new Date()
        });
        await user.save();
      } else {
        user.lastLogin = new Date();
        user.name = profile.displayName;
        if (profile.photos && profile.photos.length > 0) user.picture = profile.photos[0].value;
        await user.save();
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

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

const app = express();
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:5508',
    'http://127.0.0.1:5508'
  ]
}));
app.use(express.json());
// Serve frontend static files from project root
app.use(express.static(path.join(__dirname)));

app.use(passport.initialize());

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

// ─── Course Platform Routes ───────────────────────────────────
app.use('/api/payments', paymentRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/course', courseRoutes);     // progress, access-check, submit-test, details
app.use('/api/my-courses', enrollmentRoutes); // Udemy-style alias → GET /api/my-courses/my-courses

// ─── Admin Panel Routes ───────────────────────────────────────
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);


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

// Google Auth Routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/signup.html?error=true', session: false }),
  function (req, res) {
    // Successful authentication, generate JWT
    const token = jwt.sign({ userId: req.user._id, role: req.user.role }, JWT_SECRET, { expiresIn: '7d' });

    // Create safe user object to pass to frontend
    const userSafe = {
      id: req.user._id,
      fullName: req.user.name,
      email: req.user.email,
      role: req.user.role,
      picture: req.user.picture
    };
    const userStr = encodeURIComponent(JSON.stringify(userSafe));

    // Redirect to frontend with token and user object
    res.redirect(`/index.html?token=${token}&user=${userStr}`);
  });

// Get current user from token
app.get('/api/me', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : (req.query.token || '');
  if (!token) return res.status(401).json({ ok: false, message: 'Missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await StoreUser.findById(payload.userId);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
    res.json({ ok: true, user: { id: user._id, fullName: user.name, email: user.email, role: user.role, college: user.collegeName, picture: user.picture } });
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Invalid token' });
  }
});

// Simple endpoint to list users (for dev)
app.get('/api/users', async (req, res) => {
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

// ---------------- Books API ----------------
const BOOKS_FILE = path.join(__dirname, 'data', 'books.json');

function readBooks() {
  try { return JSON.parse(fs.readFileSync(BOOKS_FILE, 'utf8') || '[]'); } catch (e) { return []; }
}
function writeBooks(books) { fs.writeFileSync(BOOKS_FILE, JSON.stringify(books, null, 2), 'utf8'); }

// Get all book listings (with optional filters)
app.get('/api/books', (req, res) => {
  let books = readBooks();
  const { college, condition, maxPrice } = req.query;
  if (college) books = books.filter(b => b.college === college);
  if (condition) books = books.filter(b => b.condition === condition);
  if (maxPrice) books = books.filter(b => b.price <= Number(maxPrice));
  res.json({ ok: true, books });
});

// List a new book for sale (requires login token)
app.post('/api/books', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ ok: false, message: 'Login required to list a book' });

  let userId, userRole;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    userId = payload.userId;
    userRole = payload.role;
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Invalid or expired token' });
  }

  const user = await StoreUser.findById(userId);
  if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

  const { name, subject, college, condition, price, img, contact } = req.body;
  if (!name || !price) return res.status(400).json({ ok: false, message: 'Book name and price are required' });

  const books = readBooks();
  const book = {
    id: Date.now().toString(),
    name,
    subject: subject || '',
    college: college || user.collegeName || '',
    condition: condition || 'Used',
    price: Number(price) || 0,
    seller: user.name || 'Anonymous',
    sellerId: user._id,
    sellerEmail: user.email || '',
    contact: contact || '',
    img: img || '',
    listedAt: new Date().toISOString()
  };
  books.unshift(book);
  writeBooks(books);
  res.json({ ok: true, message: 'Book listed successfully!', book });
});

// Delete a book listing (only by the seller)
app.delete('/api/books/:id', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ ok: false, message: 'Login required' });

  let userId;
  try { userId = jwt.verify(token, JWT_SECRET).userId; } catch (e) { return res.status(401).json({ ok: false, message: 'Invalid token' }); }

  let books = readBooks();
  const book = books.find(b => b.id === req.params.id);
  if (!book) return res.status(404).json({ ok: false, message: 'Book not found' });
  if (String(book.sellerId) !== String(userId)) return res.status(403).json({ ok: false, message: 'Not your listing' });
  books = books.filter(b => b.id !== req.params.id);
  writeBooks(books);
  res.json({ ok: true, message: 'Book removed' });
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('API listening on port', PORT));

