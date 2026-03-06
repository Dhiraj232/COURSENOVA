const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const getMyCourses = async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ userId: req.user.id })
            .populate('courseId', 'title description videoLink');
        res.json(enrollments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await require('../models/User').find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const generateCertificate = async (req, res) => {
    try {
        const enrollment = await Enrollment.findOne({ userId: req.user.id, courseId: req.params.courseId })
            .populate('courseId', 'title')
            .populate('userId', 'name');

        if (!enrollment) {
            return res.status(404).json({ message: 'Enrollment not found' });
        }

        // Generate PDF
        const doc = new PDFDocument({
            layout: 'landscape',
            size: 'A4',
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=certificate-${req.user.id}.pdf`);

        doc.pipe(res);

        // Simple Certificate Design
        doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).fill('#f9f9f9');
        doc.rect(25, 25, doc.page.width - 50, doc.page.height - 50).stroke('#333');

        doc.font('Helvetica-Bold').fontSize(40).fillColor('#333').text('Certificate of Completion', { align: 'center' }, 100);
        doc.moveDown();
        doc.font('Helvetica').fontSize(20).text('This is to certify that', { align: 'center' });
        doc.moveDown();
        doc.font('Helvetica-Bold').fontSize(30).fillColor('#0056b3').text(enrollment.userId.name, { align: 'center' });
        doc.moveDown();
        doc.font('Helvetica').fontSize(20).fillColor('#333').text('has successfully completed the course', { align: 'center' });
        doc.moveDown();
        doc.font('Helvetica-Bold').fontSize(25).fillColor('#0056b3').text(enrollment.courseId.title, { align: 'center' });
        doc.moveDown(2);

        const date = enrollment.purchaseDate.toLocaleDateString();

        doc.font('Helvetica').fontSize(15).fillColor('#333').text(`Date of Enrollment: ${date}`, 50, doc.page.height - 100);
        doc.font('Helvetica-Bold').fontSize(20).fillColor('#333').text('RENVOX AI', doc.page.width - 200, doc.page.height - 100);

        doc.end();

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getMyCourses, generateCertificate, getAllUsers };
