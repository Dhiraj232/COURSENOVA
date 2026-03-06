const Payment = require('../models/Payment');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

const submitPayment = async (req, res) => {
    try {
        const { name, email, courseId, courseName, utr } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'No screenshot uploaded' });
        }

        const testPayment = new Payment({
            userId: req.user.id,
            name,
            email,
            courseId,
            courseName,
            utr,
            screenshot: `/uploads/${req.file.filename}`
        });

        const createdPayment = await testPayment.save();
        res.status(201).json(createdPayment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getPayments = async (req, res) => {
    try {
        const payments = await Payment.find({}).populate('userId', 'name email').populate('courseId', 'title');
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const approvePayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (payment) {
            payment.status = 'approved';
            await payment.save();

            // Create Enrollment
            const enrollmentExists = await Enrollment.findOne({ userId: payment.userId, courseId: payment.courseId });
            if (!enrollmentExists) {
                await Enrollment.create({
                    userId: payment.userId,
                    courseId: payment.courseId
                });
            }

            res.json({ message: 'Payment approved, user enrolled' });
        } else {
            res.status(404).json({ message: 'Payment not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const rejectPayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (payment) {
            payment.status = 'rejected';
            await payment.save();
            res.json({ message: 'Payment rejected' });
        } else {
            res.status(404).json({ message: 'Payment not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { submitPayment, getPayments, approvePayment, rejectPayment };
