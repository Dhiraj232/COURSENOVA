/**
 * controllers/emailController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Legacy Email Controller (delegates to the optimized unified emailService)
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const emailService = require('../services/emailService');

/**
 * Send an email with the certificate PDF attached.
 */
async function sendCertificateEmail({ toEmail, userName, courseName, certFilePath, certId }) {
    return emailService.sendCertificateWithAttachment({
        toEmail,
        userName,
        courseName,
        certFilePath,
        certId
    });
}

module.exports = { sendCertificateEmail };
