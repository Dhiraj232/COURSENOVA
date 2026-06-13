/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║          COURSENOVA — EMAIL SERVICE                                  ║
 * ║  Branded HTML email templates + queue + deduplication               ║
 * ║  Powered by Nodemailer (already installed)                           ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

const nodemailer = require('nodemailer');

// ── Transporter Configuration ─────────────────────────────────────────────────
let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
    const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
    const emailHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const emailPort = parseInt(process.env.SMTP_PORT || '587');

    if (!emailUser || !emailPass) {
        console.warn('[EmailService] ⚠️ Email credentials missing — email sending disabled');
        return null;
    }

    transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailPort === 465,
        auth: { user: emailUser, pass: emailPass },
        pool: true,           // Connection pooling for performance
        maxConnections: 5,    // Max parallel SMTP connections
        maxMessages: 100,     // Messages per connection before reconnect
        rateDelta: 1000,      // Min ms between sends
        rateLimit: 5          // Max sends per rateDelta
    });

    // Verify connection on startup
    transporter.verify((err) => {
        if (err) console.warn('[EmailService] SMTP connection failed:', err.message);
        else console.log('[EmailService] ✅ SMTP ready');
    });

    return transporter;
}

// ── Deduplication (in-memory, 24h TTL) ────────────────────────────────────────
const sentEmailKeys = new Map(); // key -> timestamp

function isDuplicateEmail(key) {
    const lastSent = sentEmailKeys.get(key);
    if (!lastSent) return false;
    const hoursSince = (Date.now() - lastSent) / (1000 * 60 * 60);
    return hoursSince < 24; // Block if same email sent in last 24h
}

function markEmailSent(key) {
    sentEmailKeys.set(key, Date.now());
    // Cleanup old entries every 1000 marks
    if (sentEmailKeys.size > 1000) {
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        for (const [k, ts] of sentEmailKeys) {
            if (ts < dayAgo) sentEmailKeys.delete(k);
        }
    }
}

// ── Queue (simple in-memory) ──────────────────────────────────────────────────
const emailQueue = [];
let isProcessingQueue = false;

async function processQueue() {
    if (isProcessingQueue || emailQueue.length === 0) return;
    isProcessingQueue = true;

    while (emailQueue.length > 0) {
        const job = emailQueue.shift();
        try {
            await sendEmailDirect(job);
            await new Promise(r => setTimeout(r, 200)); // Rate limit: 5/sec max
        } catch (err) {
            console.error('[EmailService] Queue job failed:', err.message);
            // Re-queue with retry count
            if ((job.retries || 0) < 3) {
                emailQueue.push({ ...job, retries: (job.retries || 0) + 1 });
            }
        }
    }

    isProcessingQueue = false;
}

async function sendEmailDirect({ to, subject, html, text, attachments }) {
    const t = getTransporter();
    if (!t) return;

    const fromName = process.env.EMAIL_FROM_NAME || 'CourseNova';
    const fromAddr = process.env.EMAIL_USER || process.env.SMTP_USER;

    await t.sendMail({
        from: `"${fromName}" <${fromAddr}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
        attachments
    });
}

/**
 * Main send function — queues email with dedup check
 */
async function sendEmail({ to, subject, html, text, attachments, dedupeKey }) {
    if (!to) return;

    // Dedup check
    const key = dedupeKey || `${to}:${subject}`;
    if (isDuplicateEmail(key)) {
        console.log(`[EmailService] Skipping duplicate email to ${to} — ${subject}`);
        return;
    }
    markEmailSent(key);

    emailQueue.push({ to, subject, html, text, attachments });
    setImmediate(processQueue); // Process async, non-blocking
}

// ── BRANDED EMAIL BASE TEMPLATE ───────────────────────────────────────────────
function baseTemplate(content, previewText = '') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>CourseNova</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f3f4f6; color: #1f2937; }
        .wrapper { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #4f46e5 100%); padding: 32px 40px; text-align: center; }
        .header img { height: 48px; margin-bottom: 8px; }
        .header h1 { color: white; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .header .tagline { color: rgba(255,255,255,0.8); font-size: 13px; margin-top: 4px; }
        .body { padding: 40px; }
        .greeting { font-size: 22px; font-weight: 700; color: #1f2937; margin-bottom: 16px; }
        .text { font-size: 15px; line-height: 1.7; color: #4b5563; margin-bottom: 16px; }
        .highlight-box { background: linear-gradient(135deg, #eef2ff, #f0fdf4); border: 1px solid #c7d2fe; border-radius: 12px; padding: 20px 24px; margin: 24px 0; }
        .highlight-box h3 { font-size: 16px; font-weight: 700; color: #1e3a8a; margin-bottom: 8px; }
        .highlight-box p { font-size: 14px; color: #4b5563; line-height: 1.6; }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 700; margin: 24px 0; letter-spacing: 0.3px; }
        .cta-btn:hover { opacity: 0.9; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
        .info-row .label { font-size: 13px; color: #9ca3af; }
        .info-row .value { font-size: 13px; font-weight: 600; color: #1f2937; }
        .footer { background: #f8fafc; padding: 28px 40px; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer p { font-size: 12px; color: #9ca3af; line-height: 1.6; }
        .footer a { color: #4f46e5; text-decoration: none; }
        .social-links { display: flex; justify-content: center; gap: 12px; margin: 16px 0; }
        .social-links a { color: #6b7280; font-size: 12px; text-decoration: none; }
        .divider { height: 1px; background: #e5e7eb; margin: 24px 0; }
        .badge { display: inline-block; background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
        @media (max-width: 600px) {
            .wrapper { margin: 0; border-radius: 0; }
            .header { padding: 24px; }
            .body { padding: 24px; }
            .footer { padding: 20px 24px; }
        }
    </style>
</head>
<body>
    ${previewText ? `<div style="display:none;font-size:1px;color:#fff;max-height:0;overflow:hidden;">${previewText}</div>` : ''}
    <div class="wrapper">
        <div class="header">
            <h1>📚 COURSENOVA</h1>
            <div class="tagline">India's Premium Learning Platform</div>
        </div>
        <div class="body">
            ${content}
        </div>
        <div class="footer">
            <div class="social-links">
                <a href="https://www.instagram.com/coursenova.in/">Instagram</a> |
                <a href="https://www.linkedin.com/in/course-nova-26958b405/">LinkedIn</a> |
                <a href="https://github.com/Dhiraj232">GitHub</a>
            </div>
            <p>© ${new Date().getFullYear()} CourseNova. All rights reserved.</p>
            <p style="margin-top:8px;">
                <a href="https://www.coursenova.in/privacy-policy">Privacy Policy</a> ·
                <a href="https://www.coursenova.in/terms-and-conditions">Terms of Service</a> ·
                <a href="https://www.coursenova.in/">Visit CourseNova</a>
            </p>
            <p style="margin-top:12px;font-size:11px;color:#d1d5db;">
                You received this email because you have an account on CourseNova.<br>
                Chandigarh, India — support@coursenova.in
            </p>
        </div>
    </div>
</body>
</html>`;
}

// ── EMAIL TEMPLATES ────────────────────────────────────────────────────────────

/**
 * Welcome email — sent on first login / registration
 */
async function sendWelcomeEmail(user) {
    const firstName = (user.name || user.fullName || 'Learner').split(' ')[0];
    const html = baseTemplate(`
        <div class="badge">🎉 Welcome to CourseNova!</div>
        <div class="greeting">Hey ${firstName}, you're in! 🚀</div>
        <p class="text">
            Welcome to <strong>CourseNova</strong> — India's premium online learning platform.
            We're thrilled to have you on board!
        </p>
        <div class="highlight-box">
            <h3>🎯 What you can do on CourseNova</h3>
            <p>
                📚 Access premium courses · 📝 Take mock tests daily ·
                🔥 Complete daily challenges · 🏆 Earn verified certificates ·
                📖 Buy & sell study books
            </p>
        </div>
        <p class="text">Start your learning journey right now. Your first daily challenge is waiting!</p>
        <div style="text-align:center;">
            <a href="https://www.coursenova.in/daily-challenge" class="cta-btn">Start Learning →</a>
        </div>
        <div class="divider"></div>
        <p class="text" style="font-size:13px;color:#9ca3af;">
            Need help? Reply to this email or visit our community forum at
            <a href="https://www.coursenova.in/community" style="color:#4f46e5;">coursenova.in/community</a>
        </p>
    `, `Welcome to CourseNova! Your learning journey starts now.`);

    return sendEmail({
        to: user.email,
        subject: '🎉 Welcome to CourseNova — Your Learning Journey Starts Now!',
        html,
        dedupeKey: `welcome:${user.email}`
    });
}

/**
 * Purchase confirmation email
 */
async function sendPurchaseEmail(user, item) {
    const firstName = (user.name || 'Learner').split(' ')[0];
    const { title, price, orderId, type = 'Course' } = item;

    const html = baseTemplate(`
        <div class="badge">✅ Payment Successful</div>
        <div class="greeting">Payment Confirmed! 🎊</div>
        <p class="text">Hi ${firstName}, your purchase was successful. Here are your order details:</p>
        <div class="highlight-box">
            <h3>📋 Order Summary</h3>
            <div class="info-row"><span class="label">Item</span><span class="value">${title}</span></div>
            <div class="info-row"><span class="label">Type</span><span class="value">${type}</span></div>
            <div class="info-row"><span class="label">Amount</span><span class="value">₹${price}</span></div>
            ${orderId ? `<div class="info-row"><span class="label">Order ID</span><span class="value">${orderId}</span></div>` : ''}
            <div class="info-row"><span class="label">Date</span><span class="value">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
        </div>
        <p class="text">Your ${type.toLowerCase()} is now available in your dashboard. Happy learning!</p>
        <div style="text-align:center;">
            <a href="https://www.coursenova.in/dashboard" class="cta-btn">Go to Dashboard →</a>
        </div>
        <div class="divider"></div>
        <p class="text" style="font-size:13px;color:#9ca3af;">
            Keep this email as your receipt. For refund/support, contact us at support@coursenova.in
        </p>
    `, `Your ₹${price} payment for "${title}" was successful.`);

    return sendEmail({
        to: user.email,
        subject: `✅ Payment Confirmed — ${title} | CourseNova`,
        html,
        dedupeKey: `purchase:${user.email}:${orderId || title}`
    });
}

/**
 * Certificate email
 */
async function sendCertificateEmail(user, courseName, certDownloadUrl) {
    const firstName = (user.name || 'Learner').split(' ')[0];

    const html = baseTemplate(`
        <div class="badge">🏆 Certificate Earned!</div>
        <div class="greeting">Congratulations, ${firstName}! 🎓</div>
        <p class="text">
            You've successfully completed <strong>"${courseName}"</strong> on CourseNova!
            Your verified certificate is ready to download.
        </p>
        <div class="highlight-box">
            <h3>🏅 Your Achievement</h3>
            <p>
                Course: <strong>${courseName}</strong><br>
                Completed: <strong>${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong><br>
                Platform: <strong>CourseNova — Verified Certificate</strong>
            </p>
        </div>
        <p class="text">Share this certificate on LinkedIn and show the world what you've achieved!</p>
        <div style="text-align:center;">
            <a href="${certDownloadUrl || 'https://www.coursenova.in/my-certificates'}" class="cta-btn">Download Certificate →</a>
        </div>
    `, `Your certificate for "${courseName}" is ready!`);

    return sendEmail({
        to: user.email,
        subject: `🏆 Certificate Ready — ${courseName} | CourseNova`,
        html,
        dedupeKey: `certificate:${user.email}:${courseName}`
    });
}

/**
 * Certificate email with PDF attachment
 */
async function sendCertificateWithAttachment({ toEmail, userName, courseName, certFilePath, certId }) {
    const firstName = (userName || 'Learner').split(' ')[0];

    const html = baseTemplate(`
        <div class="badge">🏆 Certificate Earned!</div>
        <div class="greeting">Congratulations, ${firstName}! 🎓</div>
        <p class="text">
            You've successfully completed <strong>"${courseName}"</strong> on CourseNova!
            Your certificate of completion is attached to this email. You can also download it from your dashboard.
        </p>
        <div class="highlight-box">
            <h3>🏅 Your Achievement</h3>
            <p>
                Course: <strong>${courseName}</strong><br>
                Certificate ID: <strong>${certId}</strong><br>
                Completed: <strong>${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
            </p>
        </div>
        <p class="text">Share this certificate on LinkedIn and show the world what you've achieved!</p>
        <div style="text-align:center;">
            <a href="https://www.coursenova.in/dashboard" class="cta-btn">Go to Dashboard →</a>
        </div>
    `, `Your certificate for "${courseName}" is attached!`);

    return sendEmail({
        to: toEmail,
        subject: `🏆 Certificate Ready — ${courseName} | CourseNova`,
        html,
        attachments: [
            {
                filename: `Certificate-${certId}.pdf`,
                path: certFilePath
            }
        ],
        dedupeKey: `certificate_pdf:${toEmail}:${certId}`
    });
}

/**
 * Password reset / OTP email
 */
async function sendPasswordResetEmail(email, otp) {
    const html = baseTemplate(`
        <div class="greeting">Password Reset Request 🔐</div>
        <p class="text">We received a request to reset your CourseNova password. Use the OTP below:</p>
        <div style="text-align:center;margin:32px 0;">
            <div style="display:inline-block;background:linear-gradient(135deg,#eef2ff,#ede9fe);border:2px solid #4f46e5;border-radius:16px;padding:20px 40px;">
                <div style="font-size:40px;font-weight:800;letter-spacing:12px;color:#4f46e5;font-family:monospace;">${otp}</div>
                <div style="font-size:12px;color:#6b7280;margin-top:8px;">Valid for 10 minutes</div>
            </div>
        </div>
        <p class="text">
            <strong>Never share this OTP</strong> with anyone, including CourseNova support.
            If you didn't request this, ignore this email — your account is safe.
        </p>
        <div class="divider"></div>
        <p class="text" style="font-size:13px;color:#9ca3af;">
            This OTP expires in 10 minutes. For security, we never ask for your password.
        </p>
    `, `Your CourseNova OTP: ${otp}`);

    return sendEmail({
        to: email,
        subject: `🔐 Your CourseNova OTP: ${otp}`,
        html,
        dedupeKey: `otp:${email}:${Math.floor(Date.now() / 60000)}` // Unique per minute
    });
}

/**
 * Daily challenge reminder email
 */
async function sendDailyChallengeReminderEmail(user) {
    const firstName = (user.name || 'Learner').split(' ')[0];
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

    const html = baseTemplate(`
        <div class="badge">🔥 Daily Challenge</div>
        <div class="greeting">Don't break your streak, ${firstName}!</div>
        <p class="text">Today's daily challenge is live — <strong>${today}</strong>. 150 questions, 120 minutes. Join thousands of students competing right now!</p>
        <div class="highlight-box">
            <h3>📊 Why daily challenges matter</h3>
            <p>
                Students who attempt daily challenges score <strong>40% higher</strong> in competitive exams.
                ${user.streak > 0 ? `<br>You're on a <strong>${user.streak}-day streak</strong> — keep it going! 🔥` : ''}
            </p>
        </div>
        <div style="text-align:center;">
            <a href="https://www.coursenova.in/daily-challenge" class="cta-btn">Start Today's Challenge →</a>
        </div>
    `, "Today's daily challenge is waiting for you!");

    return sendEmail({
        to: user.email,
        subject: `🔥 ${firstName}, today's challenge is live! Don't miss it.`,
        html,
        dedupeKey: `daily_challenge_email:${user.email}:${new Date().toISOString().slice(0, 10)}`
    });
}

/**
 * Order status update email
 */
async function sendOrderStatusEmail(user, order, status) {
    const firstName = (user.name || 'Learner').split(' ')[0];
    const statusMessages = {
        confirmed: { emoji: '✅', title: 'Order Confirmed!', msg: 'Your order has been confirmed and is being prepared.' },
        shipped: { emoji: '📦', title: 'Order Shipped!', msg: 'Your order is on its way. Track it in your orders page.' },
        delivered: { emoji: '🎉', title: 'Order Delivered!', msg: 'Your order has been delivered. Enjoy your purchase!' },
        cancelled: { emoji: '❌', title: 'Order Cancelled', msg: 'Your order has been cancelled. A refund will be processed shortly.' }
    };

    const info = statusMessages[status] || { emoji: '📋', title: 'Order Update', msg: 'Your order status has been updated.' };

    const html = baseTemplate(`
        <div class="badge">${info.emoji} ${info.title}</div>
        <div class="greeting">Hi ${firstName},</div>
        <p class="text">${info.msg}</p>
        <div class="highlight-box">
            <h3>📦 Order Details</h3>
            <div class="info-row"><span class="label">Order ID</span><span class="value">#${order._id || order.id || 'N/A'}</span></div>
            <div class="info-row"><span class="label">Status</span><span class="value" style="color:#10b981;font-weight:700;">${status.toUpperCase()}</span></div>
            <div class="info-row"><span class="label">Date</span><span class="value">${new Date().toLocaleDateString('en-IN')}</span></div>
        </div>
        <div style="text-align:center;">
            <a href="https://www.coursenova.in/orders" class="cta-btn">View My Orders →</a>
        </div>
    `, `${info.title} — Order #${order._id}`);

    return sendEmail({
        to: user.email,
        subject: `${info.emoji} ${info.title} — CourseNova Store`,
        html,
        dedupeKey: `order:${user.email}:${order._id}:${status}`
    });
}

/**
 * New course announcement email
 */
async function sendNewCourseEmail(user, course) {
    const firstName = (user.name || 'Learner').split(' ')[0];

    const html = baseTemplate(`
        <div class="badge">🎓 New Course Available!</div>
        <div class="greeting">Hi ${firstName},</div>
        <p class="text">
            We just launched a brand new course: <strong>"${course.title}"</strong>!
            ${course.category ? `Category: <strong>${course.category}</strong>` : ''}
        </p>
        <div class="highlight-box">
            <h3>📚 About this course</h3>
            <p>${course.description || 'Comprehensive course designed for competitive exam preparation.'}</p>
            ${course.price ? `<p style="margin-top:8px;font-size:16px;font-weight:700;color:#4f46e5;">₹${course.price}</p>` : '<p style="color:#10b981;font-weight:700;">FREE</p>'}
        </div>
        <div style="text-align:center;">
            <a href="https://www.coursenova.in/certificates" class="cta-btn">View Course →</a>
        </div>
    `, `New course: "${course.title}" is now available!`);

    return sendEmail({
        to: user.email,
        subject: `🎓 New Course: "${course.title}" is Live! | CourseNova`,
        html,
        dedupeKey: `new_course_email:${user.email}:${course._id}`
    });
}

// ── EXPORTS ───────────────────────────────────────────────────────────────────
module.exports = {
    sendEmail,
    sendWelcomeEmail,
    sendPurchaseEmail,
    sendCertificateEmail,
    sendCertificateWithAttachment,
    sendPasswordResetEmail,
    sendDailyChallengeReminderEmail,
    sendOrderStatusEmail,
    sendNewCourseEmail
};
