const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const DATA_FILE = path.join(__dirname, 'data', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

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
  return users.find(u => (u.email && u.email.toLowerCase() === (identifier||'').toLowerCase()) || (u.mobile && u.mobile === identifier));
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const app = express();
app.use(cors());
app.use(express.json());
// Serve frontend static files from project root
app.use(express.static(path.join(__dirname)));

// Signup
app.post('/api/signup', async (req, res) => {
  const { fullName, email, mobile, password, role, college, classInfo } = req.body;
  if (!fullName || !email || !mobile || !password) return res.status(400).json({ ok:false, message:'Missing required fields' });

  const existing = findUserByEmailOrMobile(email) || findUserByEmailOrMobile(mobile);
  if (existing) return res.status(409).json({ ok:false, message:'User already exists' });

  const hash = await bcrypt.hash(password, 10);
  const users = readUsers();
  const id = Date.now().toString();
  const otp = generateOtp();
  const otpExpiry = Date.now() + 5*60*1000; // 5 minutes

  const user = {
    id, fullName, email, mobile, passwordHash: hash, role: role||'student', college: college||'', classInfo: classInfo||'', verified: false,
    otp, otpExpiry
  };
  users.push(user);
  writeUsers(users);

  // In real app: send OTP via SMS / email. For demo we log it.
  console.log('Signup OTP for', email || mobile, otp);

  res.json({ ok:true, message:'User created. OTP sent.', userId:id });
});

// Send (or resend) OTP
app.post('/api/send-otp', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ ok:false, message:'userId required' });
  const users = readUsers();
  const user = users.find(u => String(u.id) === String(userId));
  if (!user) return res.status(404).json({ ok:false, message:'User not found' });
  const otp = generateOtp();
  user.otp = otp;
  user.otpExpiry = Date.now() + 5*60*1000;
  writeUsers(users);
  console.log('Resent OTP for', user.email||user.mobile, otp);
  return res.json({ ok:true, message:'OTP resent' });
});

// Verify OTP
app.post('/api/verify-otp', (req, res) => {
  const { userId, code } = req.body;
  if (!userId || !code) return res.status(400).json({ ok:false, message:'userId and code required' });
  const users = readUsers();
  const user = users.find(u => String(u.id) === String(userId));
  if (!user) return res.status(404).json({ ok:false, message:'User not found' });
  if (!user.otp || Date.now() > (user.otpExpiry||0)) return res.status(400).json({ ok:false, message:'OTP expired or not set' });
  if (user.otp !== code) return res.status(400).json({ ok:false, message:'Invalid OTP' });
  user.verified = true;
  user.otp = null; user.otpExpiry = null;
  writeUsers(users);

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ ok:true, message:'Verified', token });
});

// Login
app.post('/api/login', async (req, res) => {
  const { identifier, password } = req.body; // identifier = email or mobile
  if (!identifier || !password) return res.status(400).json({ ok:false, message:'Missing fields' });
  const user = findUserByEmailOrMobile(identifier);
  if (!user) return res.status(404).json({ ok:false, message:'User not found' });
  const match = await bcrypt.compare(password, user.passwordHash || '');
  if (!match) return res.status(401).json({ ok:false, message:'Invalid credentials' });
  if (!user.verified) return res.status(403).json({ ok:false, message:'Account not verified', userId: user.id });
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ ok:true, token, user: { id: user.id, fullName: user.fullName, email: user.email, mobile: user.mobile } });
});

// Get current user from token
app.get('/api/me', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : (req.query.token || '');
  if (!token) return res.status(401).json({ ok:false, message:'Missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const users = readUsers();
    const user = users.find(u => String(u.id) === String(payload.userId));
    if (!user) return res.status(404).json({ ok:false, message:'User not found' });
    res.json({ ok:true, user: { id: user.id, fullName: user.fullName, email: user.email, mobile: user.mobile, verified: user.verified, role: user.role, college: user.college } });
  } catch (err) {
    return res.status(401).json({ ok:false, message:'Invalid token' });
  }
});

// Simple endpoint to list users (for dev)
app.get('/api/users', (req, res) => {
  const users = readUsers();
  const safe = users.map(u => ({ id:u.id, fullName:u.fullName, email:u.email, mobile:u.mobile, verified:u.verified, role:u.role }));
  res.json(safe);
});

// ---------------- Seller verification (college email) ----------------
app.post('/api/request-verification', (req, res) => {
  const { userId, collegeEmail } = req.body;
  if (!userId || !collegeEmail) return res.status(400).json({ ok:false, message:'userId and collegeEmail required' });
  const users = readUsers();
  const user = users.find(u => String(u.id) === String(userId));
  if (!user) return res.status(404).json({ ok:false, message:'User not found' });
  // generate a short token
  const token = Math.random().toString(36).slice(2, 10);
  user.collegeVerification = { collegeEmail, token, expiry: Date.now() + 24*60*60*1000 };
  writeUsers(users);
  // In production send verification email to collegeEmail with tokenized link
  console.log(`College verification link (mock): http://localhost:${PORT || 4000}/api/verify-college?token=${token}`);
  res.json({ ok:true, message:'Verification email sent (mock). Check server console for link.' });
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
  if (!bookId || !text) return res.status(400).json({ ok:false, message:'bookId and text required' });
  const msgs = readMessages();
  const msg = { id: Date.now(), bookId, from: from || 'Anonymous', text, ts: Date.now() };
  msgs.push(msg);
  writeMessages(msgs);
  res.json({ ok:true, message: 'Message saved', msg });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('API listening on port', PORT));
