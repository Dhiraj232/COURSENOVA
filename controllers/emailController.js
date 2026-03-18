const nodemailer = require('nodemailer');
const path = require('path');

/**
 * Send an email with the certificate PDF attached.
 */
async function sendCertificateEmail({ toEmail, userName, courseName, certFilePath, certId }) {
    // Create transporter — uses Gmail by default.
    // Set EMAIL_USER and EMAIL_PASS in your .env file.
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️  EMAIL_USER or EMAIL_PASS not set. Certificate email will not be sent.');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS   // Use an App Password (not your login password)
        }
    });

    const subject = 'Your Course Certificate - RENVOX AI';

    const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #6366f1; padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: #fff; font-size: 24px;">🎓 RENVOX AI</h1>
        </div>
        <div style="padding: 32px;">
            <h2 style="color: #fbbf24; margin-top: 0;">Congratulations, ${userName}! 🎉</h2>
            <p style="color: #94a3b8; line-height: 1.7;">
                You have successfully completed the course <strong style="color:#fff;">${courseName}</strong> on RENVOX AI.<br><br>
                Your certificate of completion is attached to this email. You can also download it from your dashboard.
            </p>
            <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="margin: 0; color: #94a3b8; font-size: 13px;">Certificate ID</p>
                <p style="margin: 4px 0 0; color: #6366f1; font-weight: bold; font-size: 16px;">${certId}</p>
            </div>
            <p style="color: #64748b; font-size: 13px; margin-bottom: 0;">
                Keep learning, keep growing. — The RENVOX AI Team
            </p>
        </div>
    </div>
    `;

    const mailOptions = {
        from: `"RENVOX AI" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject,
        html,
        attachments: [
            {
                filename: `Certificate-${certId}.pdf`,
                path: certFilePath
            }
        ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Certificate email sent to ${toEmail} for course "${courseName}"`);
}

module.exports = { sendCertificateEmail };
