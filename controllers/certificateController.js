const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate a certificate PDF for a user who completed a course.
 * Returns the file path of the generated certificate.
 */
async function generateCertificate({ userName, courseName, completionDate, certId }) {
    const certsDir = path.join(__dirname, '..', 'certificates');
    if (!fs.existsSync(certsDir)) {
        fs.mkdirSync(certsDir, { recursive: true });
    }

    const fileName = `certificate-${certId}.pdf`;
    const filePath = path.join(certsDir, fileName);

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            layout: 'landscape',
            size: 'A4',
            margin: 0
        });

        const out = fs.createWriteStream(filePath);
        doc.pipe(out);

        const W = doc.page.width;
        const H = doc.page.height;

        // ── Background gradient simulation (solid + overlay) ──────────────
        doc.rect(0, 0, W, H).fill('#0f172a');

        // Decorative top & bottom bands
        doc.rect(0, 0, W, 8).fill('#6366f1');
        doc.rect(0, H - 8, W, 8).fill('#6366f1');

        // Side bands
        doc.rect(0, 0, 8, H).fill('#6366f1');
        doc.rect(W - 8, 0, 8, H).fill('#6366f1');

        // Inner light border
        doc.rect(28, 28, W - 56, H - 56).lineWidth(1).stroke('#6366f140');

        // ── Logo area ─────────────────────────────────────────────────────
        doc.fontSize(14)
            .fillColor('#6366f1')
            .font('Helvetica-Bold')
            .text('RENVOX AI', 0, 45, { align: 'center' });

        // ── CERTIFICATE OF COMPLETION heading ─────────────────────────────
        doc.fontSize(32)
            .fillColor('#ffffff')
            .text('CERTIFICATE OF COMPLETION', 0, 80, { align: 'center' });

        // Decorative divider line
        const lineY = 130;
        doc.moveTo(80, lineY).lineTo(W - 80, lineY).lineWidth(1.5).stroke('#6366f1');

        // ── "This is to certify that" ─────────────────────────────────────
        doc.fontSize(14)
            .fillColor('#94a3b8')
            .font('Helvetica')
            .text('THIS IS TO CERTIFY THAT', 0, 150, { align: 'center' });

        // ── Student Name ──────────────────────────────────────────────────
        doc.fontSize(36)
            .fillColor('#fbbf24')
            .font('Helvetica-Bold')
            .text(userName, 0, 175, { align: 'center' });

        // ── "has successfully completed" ─────────────────────────────────
        doc.fontSize(14)
            .fillColor('#94a3b8')
            .font('Helvetica')
            .text('has successfully completed the course', 0, 225, { align: 'center' });

        // ── Course Name ───────────────────────────────────────────────────
        doc.fontSize(26)
            .fillColor('#ffffff')
            .font('Helvetica-Bold')
            .text(courseName, 60, 255, { align: 'center', width: W - 120 });

        // Decorative divider line
        const lineY2 = 310;
        doc.moveTo(80, lineY2).lineTo(W - 80, lineY2).lineWidth(1.5).stroke('#6366f1');

        // ── Footer row: date, cert id, issuer ────────────────────────────
        const footerY = 330;

        // Completion Date (left)
        doc.fontSize(11)
            .fillColor('#94a3b8')
            .font('Helvetica')
            .text('Date of Completion', 80, footerY);
        doc.fontSize(13)
            .fillColor('#ffffff')
            .font('Helvetica-Bold')
            .text(completionDate, 80, footerY + 18);

        // Certificate ID (center)
        doc.fontSize(11)
            .fillColor('#94a3b8')
            .font('Helvetica')
            .text('Certificate ID', 0, footerY, { align: 'center' });
        doc.fontSize(13)
            .fillColor('#6366f1')
            .font('Helvetica-Bold')
            .text(certId, 0, footerY + 18, { align: 'center' });

        // Issued by (right)
        doc.fontSize(11)
            .fillColor('#94a3b8')
            .font('Helvetica')
            .text('Issued By', W - 200, footerY, { width: 120, align: 'right' });
        doc.fontSize(13)
            .fillColor('#ffffff')
            .font('Helvetica-Bold')
            .text('RENVOX AI', W - 200, footerY + 18, { width: 120, align: 'right' });

        doc.end();

        out.on('finish', () => resolve({ filePath, fileName }));
        out.on('error', reject);
    });
}

module.exports = { generateCertificate };
