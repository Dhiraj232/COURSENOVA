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

        // ── Clean White Background ─────────────────────────────────────────
        doc.rect(0, 0, W, H).fill('#ffffff');

        // ── Elegant Borders ───────────────────────────────────────────────
        doc.rect(40, 40, W - 80, H - 80).lineWidth(1.5).stroke('#e2e8f0'); // Outer subtle
        doc.rect(48, 48, W - 96, H - 96).lineWidth(0.5).stroke('#cbd5e1'); // Inner fine

        // Accent corner decorations
        const cornerSize = 40;
        doc.lineWidth(3).strokeColor('#1e40af'); // Deep blue accent
        
        // Top Left
        doc.moveTo(40, 80).lineTo(40, 40).lineTo(80, 40).stroke();
        // Top Right
        doc.moveTo(W-80, 40).lineTo(W-40, 40).lineTo(W-40, 80).stroke();
        // Bottom Left
        doc.moveTo(40, H-80).lineTo(40, H-40).lineTo(80, H-40).stroke();
        // Bottom Right
        doc.moveTo(W-80, H-40).lineTo(W-40, H-40).lineTo(W-40, H-80).stroke();

        // ── Header: Brand ──────────────────────────────────────────────────
        doc.fontSize(16)
            .fillColor('#1e40af')
            .font('Helvetica-Bold')
            .text('COURSENOVA', 0, 70, { align: 'center' });

        // ── Main Header ────────────────────────────────────────────────────
        doc.fontSize(36)
            .fillColor('#1e293b')
            .font('Times-Bold') // Serif-like
            .text('Certificate of Completion', 0, 130, { align: 'center' });

        // ── "This is to certify that" ─────────────────────────────────────
        doc.fontSize(14)
            .fillColor('#64748b')
            .font('Helvetica')
            .text('This is to certify that', 0, 190, { align: 'center' });

        // ── Full Name (Large Serif) ────────────────────────────────────────
        doc.fontSize(48)
            .fillColor('#0f172a')
            .font('Times-Bold')
            .text(userName, 0, 220, { align: 'center' });

        // Underline for name
        doc.moveTo(W/2 - 200, 275).lineTo(W/2 + 200, 275).lineWidth(1).stroke('#e2e8f0');

        // ── "has successfully completed" ─────────────────────────────────
        doc.fontSize(14)
            .fillColor('#64748b')
            .font('Helvetica')
            .text('has successfully completed the professional course', 0, 295, { align: 'center' });

        // ── Course Name (Professional Bold) ───────────────────────────────
        doc.fontSize(28)
            .fillColor('#1e40af')
            .font('Helvetica-Bold')
            .text(courseName, 80, 325, { align: 'center', width: W - 160 });

        // ── Footer: Date, Cert ID, Authority ─────────────────────────────
        const footerY = 440;

        // Completion Date
        doc.fontSize(10)
            .fillColor('#94a3b8')
            .font('Helvetica')
            .text('DATE OF ISSUANCE', 100, footerY);
        doc.fontSize(12)
            .fillColor('#1e293b')
            .font('Helvetica-Bold')
            .text(completionDate, 100, footerY + 15);

        // Certificate ID (Small/Subtle)
        doc.fontSize(8)
            .fillColor('#cbd5e1')
            .font('Helvetica')
            .text(`Verify at coursenova.com/verify\nCertificate ID: ${certId}`, 0, H - 70, { align: 'center' });

        // Signature Area
        doc.fontSize(10)
            .fillColor('#94a3b8')
            .font('Helvetica')
            .text('OFFICIAL REPRESENTATIVE', W - 250, footerY, { align: 'center', width: 150 });
        
        doc.moveTo(W - 250, footerY + 35).lineTo(W - 100, footerY + 35).lineWidth(1).stroke('#e2e8f0');
        
        doc.fontSize(12)
            .fillColor('#1e293b')
            .font('Times-Italic')
            .text('COURSENOVA Learning', W - 250, footerY + 45, { align: 'center', width: 150 });

        doc.end();

        out.on('finish', () => resolve({ filePath, fileName }));
        out.on('error', reject);
    });
}

module.exports = { generateCertificate };
