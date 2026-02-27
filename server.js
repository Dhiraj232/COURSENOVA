const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { OAuth2Client } = require('google-auth-library');
const mongoose = require('mongoose');

// ─── Store Router (MongoDB-backed) ───────────────────────────
const storeRouter = require('./routes/store');

// ─── MongoDB Connection ───────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/renvox';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected:', MONGO_URI.split('@').pop() || MONGO_URI))
  .catch(err => console.error('❌ MongoDB connection error:', err.message, '\n   Set MONGO_URI env var or start MongoDB locally.'));

const DATA_FILE = path.join(__dirname, 'data', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '515938781385-pch5g9vm1ec8tjqeq1au73ni3ov6fepn.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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
app.use(cors());
app.use(express.json());
// Serve frontend static files from project root
app.use(express.static(path.join(__dirname)));

// ─── Store Routes (Private Book Exchange) ────────────────────
app.use('/api/store', storeRouter);

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
    res.json({ ok: true, orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    console.error('Razorpay Create Order Error:', error);
    res.status(500).json({ ok: false, message: 'Failed to create order' });
  }
});

// Verify Payment API
app.post('/api/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const secret = process.env.RAZORPAY_KEY_SECRET || 'tK0lWjAOr3mR0K9uI3uSqkZ1';
  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body.toString())
    .digest('hex');

  const isAuthentic = expectedSignature === razorpay_signature;

  if (isAuthentic) {
    // In a real app, save payment success to database here
    res.json({ ok: true, message: 'Payment verified successfully' });
  } else {
    res.status(400).json({ ok: false, message: 'Invalid payment signature' });
  }
});

// Signup
app.post('/api/signup', async (req, res) => {
  try {
    const { fullName, email, mobile, password, role, college, classInfo } = req.body;
    if (!fullName || !email || !mobile || !password) return res.status(400).json({ ok: false, message: 'Missing required fields' });

    const existing = findUserByEmailOrMobile(email) || findUserByEmailOrMobile(mobile);
    if (existing) return res.status(409).json({ ok: false, message: 'User already exists' });

    const hash = await bcrypt.hash(password, 10);
    const users = readUsers();
    const id = Date.now().toString();
    const otp = generateOtp();
    const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes

    const user = {
      id, fullName, email, mobile, passwordHash: hash, role: role || 'student', college: college || '', classInfo: classInfo || '', verified: false,
      otp, otpExpiry
    };
    users.push(user);
    writeUsers(users);

    // In real app: send OTP via SMS / email. For demo we log it.
    console.log('Signup OTP for', email || mobile, otp);

    res.json({ ok: true, message: 'User created. OTP sent.', userId: id });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ ok: false, message: 'Server error during signup' });
  }
});

// Send (or resend) OTP
app.post('/api/send-otp', (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ ok: false, message: 'userId required' });
    const users = readUsers();
    const user = users.find(u => String(u.id) === String(userId));
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiry = Date.now() + 5 * 60 * 1000;
    writeUsers(users);
    console.log('Resent OTP for', user.email || user.mobile, otp);
    return res.json({ ok: true, message: 'OTP resent' });
  } catch (error) {
    console.error('Resend OTP Error:', error);
    res.status(500).json({ ok: false, message: 'Server error during OTP resend' });
  }
});

// Verify OTP
app.post('/api/verify-otp', (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ ok: false, message: 'userId and code required' });
    const users = readUsers();
    const user = users.find(u => String(u.id) === String(userId));
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
    if (!user.otp || Date.now() > (user.otpExpiry || 0)) return res.status(400).json({ ok: false, message: 'OTP expired or not set' });
    if (user.otp !== code) return res.status(400).json({ ok: false, message: 'Invalid OTP' });
    user.verified = true;
    user.otp = null; user.otpExpiry = null;
    writeUsers(users);

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ ok: true, message: 'Verified', token, user: { id: user.id, fullName: user.fullName, email: user.email, mobile: user.mobile } });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ ok: false, message: 'Server error during verification' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier = email or mobile
    if (!identifier || !password) return res.status(400).json({ ok: false, message: 'Missing fields' });

    // Ensure data directory exists
    if (!fs.existsSync(path.dirname(DATA_FILE))) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    }

    const user = findUserByEmailOrMobile(identifier);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
    const match = await bcrypt.compare(password, user.passwordHash || '');
    if (!match) return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    if (!user.verified) return res.status(403).json({ ok: false, message: 'Account not verified', userId: user.id });
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ ok: true, token, user: { id: user.id, fullName: user.fullName, email: user.email, mobile: user.mobile } });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ ok: false, message: 'Server error during login' });
  }
});

// Get current user from token
app.get('/api/me', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : (req.query.token || '');
  if (!token) return res.status(401).json({ ok: false, message: 'Missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const users = readUsers();
    const user = users.find(u => String(u.id) === String(payload.userId));
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
    res.json({ ok: true, user: { id: user.id, fullName: user.fullName, email: user.email, mobile: user.mobile, verified: user.verified, role: user.role, college: user.college } });
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Invalid token' });
  }
});

// Google Login/Signup Endpoint
app.post('/api/google-auth', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ ok: false, message: 'No credential provided' });

    // In a real live app, verify the token using google-auth-library:
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    // For local dummy testing without a real Client ID, we can decode the JWT locally:
    // const payload = jwt.decode(credential);

    if (!payload || !payload.email) {
      return res.status(400).json({ ok: false, message: 'Invalid token payload' });
    }

    const { email, name, picture } = payload;
    let users = readUsers();
    let user = users.find(u => u.email === email);

    if (!user) {
      // Auto-register new user
      user = {
        id: Date.now().toString(),
        fullName: name,
        email: email,
        mobile: '',
        role: 'student',
        verified: true, // Google emails are already verified
        picture: picture,
      };
      users.push(user);
      writeUsers(users);
      console.log('Created new user via Google:', email);
    } else {
      // Optional: Update picture and name if they changed
      user.fullName = name;
      user.picture = picture;
      writeUsers(users);
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      ok: true,
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, picture: user.picture }
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ ok: false, message: 'Server error during Google auth' });
  }
});

// Simple endpoint to list users (for dev)
app.get('/api/users', (req, res) => {
  const users = readUsers();
  const safe = users.map(u => ({ id: u.id, fullName: u.fullName, email: u.email, mobile: u.mobile, verified: u.verified, role: u.role }));
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
app.post('/api/update-profile', (req, res) => {
  try {
    const { userId, fullName, email, mobile, classInfo } = req.body;
    if (!userId) return res.status(400).json({ ok: false, message: 'User ID required' });

    const users = readUsers();
    const user = users.find(u => String(u.id) === String(userId));
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

    // Update fields if provided
    if (fullName) user.fullName = fullName;
    if (email) user.email = email; // In real app: verify new email
    if (mobile) user.mobile = mobile;
    if (classInfo) user.classInfo = classInfo;

    writeUsers(users);

    // Return updated user object (without password)
    res.json({ ok: true, message: 'Profile updated', user: { id: user.id, fullName: user.fullName, email: user.email, mobile: user.mobile, role: user.role, classInfo: user.classInfo, verified: user.verified } });
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
app.post('/api/books', (req, res) => {
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

  const users = readUsers();
  const user = users.find(u => String(u.id) === String(userId));
  if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

  const { name, subject, college, condition, price, img, contact } = req.body;
  if (!name || !price) return res.status(400).json({ ok: false, message: 'Book name and price are required' });

  const books = readBooks();
  const book = {
    id: Date.now().toString(),
    name,
    subject: subject || '',
    college: college || user.college || '',
    condition: condition || 'Used',
    price: Number(price) || 0,
    seller: user.fullName || 'Anonymous',
    sellerId: user.id,
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

// ────────────────────────────────────────────────────────────
// COURSE PROGRESS & CERTIFICATE SYSTEM
// ────────────────────────────────────────────────────────────
const PROGRESS_FILE = path.join(__dirname, 'data', 'progress.json');

function readProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8') || '[]'); } catch (e) { return []; }
}
function writeProgress(data) { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2), 'utf8'); }

// Save video/PDF completion progress
app.post('/api/course/progress', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ ok: false, message: 'Login required' });

  let userId;
  try { userId = jwt.verify(token, JWT_SECRET).userId; } catch (e) { return res.status(401).json({ ok: false, message: 'Invalid token' }); }

  const { courseId, videoWatched, pdfRead } = req.body;
  if (!courseId) return res.status(400).json({ ok: false, message: 'courseId required' });

  const progress = readProgress();
  let record = progress.find(p => p.userId === userId && p.courseId === courseId);
  if (!record) {
    record = { userId, courseId, videoWatched: false, pdfRead: false, testPassed: false, score: 0, certId: null, earnedAt: null };
    progress.push(record);
  }
  if (videoWatched !== undefined) record.videoWatched = videoWatched;
  if (pdfRead !== undefined) record.pdfRead = pdfRead;
  writeProgress(progress);
  res.json({ ok: true, record });
});

// Get progress for a user+course
app.get('/api/course/progress', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ ok: false, message: 'Login required' });

  let userId;
  try { userId = jwt.verify(token, JWT_SECRET).userId; } catch (e) { return res.status(401).json({ ok: false, message: 'Invalid token' }); }

  const { courseId } = req.query;
  const progress = readProgress();
  const record = progress.find(p => p.userId === userId && p.courseId === courseId) || {};
  res.json({ ok: true, record });
});

// Submit test answers
app.post('/api/course/submit-test', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ ok: false, message: 'Login required' });

  let userId;
  try { userId = jwt.verify(token, JWT_SECRET).userId; } catch (e) { return res.status(401).json({ ok: false, message: 'Invalid token' }); }

  const { courseId, answers, correctAnswers } = req.body;
  if (!courseId || !answers || !correctAnswers) return res.status(400).json({ ok: false, message: 'Missing fields' });

  // Grade the test
  let correct = 0;
  answers.forEach((ans, i) => { if (String(ans) === String(correctAnswers[i])) correct++; });
  const total = correctAnswers.length;
  const score = Math.round((correct / total) * 100);
  const passed = score >= 60;

  const progress = readProgress();
  let record = progress.find(p => p.userId === userId && p.courseId === courseId);
  if (!record) {
    record = { userId, courseId, videoWatched: false, pdfRead: false, testPassed: false, score: 0, certId: null, earnedAt: null };
    progress.push(record);
  }
  record.score = score;
  record.testPassed = passed;
  if (passed && !record.certId) {
    record.certId = 'RENV-' + Date.now().toString(36).toUpperCase();
    record.earnedAt = new Date().toISOString();
  }
  writeProgress(progress);

  // Get user info for certificate
  const users = readUsers();
  const user = users.find(u => String(u.id) === String(userId));

  res.json({ ok: true, passed, score, correct, total, certId: record.certId, earnedAt: record.earnedAt, userName: user ? user.fullName : 'Student' });
});

// Get all certificates for a user
app.get('/api/course/my-certificates', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ ok: false, message: 'Login required' });

  let userId;
  try { userId = jwt.verify(token, JWT_SECRET).userId; } catch (e) { return res.status(401).json({ ok: false, message: 'Invalid token' }); }

  const progress = readProgress();
  const certs = progress.filter(p => p.userId === userId && p.testPassed && p.certId);

  const users = readUsers();
  const user = users.find(u => String(u.id) === String(userId));

  res.json({ ok: true, certificates: certs, userName: user ? user.fullName : 'Student', userEmail: user ? user.email : '' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('API listening on port', PORT));

