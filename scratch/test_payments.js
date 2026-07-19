'use strict';

// Load environment variables
require('dotenv').config();

const mongoose = require('mongoose');
const crypto = require('crypto');
const razorpayController = require('../controllers/razorpayController');

// Models
const CourseOrder = require('../models/CourseOrder');
const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const MockTestPack = require('../models/MockTestPack');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Mock data & setup
const TEST_USER_ID = new mongoose.Types.ObjectId();
const TEST_COURSE_ID = new mongoose.Types.ObjectId();
const TEST_MOCK_PACK_ID = new mongoose.Types.ObjectId();

async function runTests() {
    console.log('🧪 Starting Razorpay Payment Integration Tests...\n');

    // 1. Connect to DB
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/coursenova-test';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // 2. Setup mock data in DB
    console.log('🧹 Preparing mock data...');
    await Course.deleteMany({ $or: [{ _id: TEST_COURSE_ID }, { slug: 'premium-nodejs-mastery' }] });
    await MockTestPack.deleteMany({ $or: [{ _id: TEST_MOCK_PACK_ID }, { id: 'premium-mock-pack' }] });
    await User.deleteMany({ $or: [{ _id: TEST_USER_ID }, { googleId: 'test_google_id_123' }] });
    await CourseOrder.deleteMany({ userId: TEST_USER_ID });
    await Payment.deleteMany({ userId: TEST_USER_ID });
    await Enrollment.deleteMany({ userId: TEST_USER_ID });
    await Transaction.deleteMany({ userId: TEST_USER_ID });

    // Seed mock user
    const mockUser = await User.create({
        _id: TEST_USER_ID,
        googleId: 'test_google_id_123',
        name: 'Test Student',
        email: 'teststudent@coursenova.in',
        phone: '9876543210',
        role: 'student'
    });

    // Seed mock premium course
    const mockCourse = await Course.create({
        _id: TEST_COURSE_ID,
        title: 'Premium Node.js Mastery',
        slug: 'premium-nodejs-mastery',
        price: 499,
        isFree: false,
        lessons: []
    });

    // Seed mock premium test pack
    const mockTestPack = await MockTestPack.create({
        _id: TEST_MOCK_PACK_ID,
        id: 'premium-mock-pack',
        title: 'Premium Test Series',
        category: 'JEE',
        price: 199,
        isFree: false
    });

    console.log('✅ Mock data seeded.\n');

    try {
        // --- TEST CASE 1: Create Order (Course purchase) ---
        console.log('--- Test Case 1: Create Order (Course purchase) ---');
        let req = {
            userId: TEST_USER_ID,
            body: { courseId: String(TEST_COURSE_ID) }
        };
        let res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { this.data = data; return this; }
        };

        await razorpayController.createOrder(req, res);
        console.log(`Response Code: ${res.statusCode}`);
        console.log(`Response Data:`, res.data);
        if (res.statusCode === 200 && res.data.ok && res.data.razorpay_order_id) {
            console.log('✅ TEST 1 PASSED: Order created successfully.\n');
        } else {
            throw new Error('TEST 1 FAILED');
        }

        const activeOrderId = res.data.razorpay_order_id;

        // --- TEST CASE 2: Already Purchased Course ---
        console.log('--- Test Case 2: Prevent duplicate purchase ---');
        // Create an enrollment first
        await Enrollment.create({
            userId: TEST_USER_ID,
            courseId: TEST_COURSE_ID,
            courseName: 'Premium Node.js Mastery',
            amount: 499,
            purchaseDate: new Date()
        });

        res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { this.data = data; return this; }
        };
        await razorpayController.createOrder(req, res);
        console.log(`Response Code: ${res.statusCode}`);
        console.log(`Response Data:`, res.data);
        if (res.statusCode === 409) {
            console.log('✅ TEST 2 PASSED: Correctly blocked duplicate purchase.\n');
        } else {
            throw new Error('TEST 2 FAILED');
        }

        // Cleanup the mock enrollment for subsequent tests
        await Enrollment.deleteMany({ userId: TEST_USER_ID });

        // --- TEST CASE 3: Premium Mock purchase ---
        console.log('--- Test Case 3: Create Order (Mock purchase) ---');
        req = {
            userId: TEST_USER_ID,
            body: { courseId: String(TEST_MOCK_PACK_ID) }
        };
        res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { this.data = data; return this; }
        };

        await razorpayController.createOrder(req, res);
        console.log(`Response Code: ${res.statusCode}`);
        console.log(`Response Data:`, res.data);
        if (res.statusCode === 200 && res.data.ok && res.data.razorpay_order_id) {
            console.log('✅ TEST 3 PASSED: Mock test order created.\n');
        } else {
            throw new Error('TEST 3 FAILED');
        }

        // --- TEST CASE 4: Verify Payment (Invalid signature) ---
        console.log('--- Test Case 4: Verify Payment (Invalid signature) ---');
        req = {
            userId: TEST_USER_ID,
            body: {
                razorpay_order_id: activeOrderId,
                razorpay_payment_id: 'pay_invalid_123',
                razorpay_signature: 'forged_signature_here'
            }
        };
        res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { this.data = data; return this; }
        };

        await razorpayController.verifyPayment(req, res);
        console.log(`Response Code: ${res.statusCode}`);
        console.log(`Response Data:`, res.data);
        if (res.statusCode === 400) {
            console.log('✅ TEST 4 PASSED: Rejected invalid signature.\n');
        } else {
            throw new Error('TEST 4 FAILED');
        }

        // --- TEST CASE 5: Verify Payment (Valid signature) ---
        console.log('--- Test Case 5: Verify Payment (Valid signature) ---');
        const paymentId = 'pay_mockpayment999';
        const secret = process.env.RAZORPAY_KEY_SECRET;
        const validSignature = crypto
            .createHmac('sha256', secret)
            .update(`${activeOrderId}|${paymentId}`)
            .digest('hex');

        req = {
            userId: TEST_USER_ID,
            body: {
                razorpay_order_id: activeOrderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: validSignature
            }
        };
        res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { this.data = data; return this; }
        };

        await razorpayController.verifyPayment(req, res);
        console.log(`Response Code: ${res.statusCode}`);
        console.log(`Response Data:`, res.data);
        if (res.statusCode === 200 && res.data.ok) {
            console.log('✅ TEST 5 PASSED: Verified signature & enrolled user.\n');
        } else {
            throw new Error('TEST 5 FAILED');
        }

        // --- TEST CASE 6: Webhook order.paid (Idempotency) ---
        console.log('--- Test Case 6: Webhook order.paid (Idempotency check) ---');
        req = {
            body: {
                event: 'order.paid',
                payload: {
                    order: {
                        entity: {
                            id: activeOrderId,
                            amount: 49900
                        }
                    },
                    payment: {
                        entity: {
                            id: paymentId,
                            amount: 49900,
                            order_id: activeOrderId
                        }
                    }
                }
            }
        };
        res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { this.data = data; return this; }
        };

        await razorpayController.webhookHandler(req, res);
        console.log(`Response Code: ${res.statusCode}`);
        console.log(`Response Data:`, res.data);
        if (res.statusCode === 200 && res.data.message === 'Already processed') {
            console.log('✅ TEST 6 PASSED: Correctly ignored already processed order.\n');
        } else {
            throw new Error('TEST 6 FAILED');
        }

        // --- TEST CASE 7: Webhook payment.failed ---
        console.log('--- Test Case 7: Webhook payment.failed ---');
        // Let's create another mock order first
        const failedOrderId = 'order_failed_test_888';
        await CourseOrder.create({
            userId: TEST_USER_ID,
            courseId: TEST_COURSE_ID,
            razorpay_order_id: failedOrderId,
            amount: 499,
            paymentStatus: 'pending',
            provider: 'Razorpay'
        });

        req = {
            body: {
                event: 'payment.failed',
                payload: {
                    payment: {
                        entity: {
                            id: 'pay_failed_888',
                            order_id: failedOrderId,
                            error_description: 'Card declined by issuing bank'
                        }
                    }
                }
            }
        };
        res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { this.data = data; return this; }
        };

        await razorpayController.webhookHandler(req, res);
        console.log(`Response Code: ${res.statusCode}`);
        if (res.statusCode === 200) {
            const updatedOrder = await CourseOrder.findOne({ razorpay_order_id: failedOrderId });
            if (updatedOrder.paymentStatus === 'failed' && updatedOrder.failureReason.includes('declined')) {
                console.log('✅ TEST 7 PASSED: Webhook logged payment failure context correctly.\n');
            } else {
                throw new Error('TEST 7 FAILED: Order status not updated');
            }
        } else {
            throw new Error('TEST 7 FAILED');
        }

        // --- TEST CASE 8: Webhook refund.created ---
        console.log('--- Test Case 8: Webhook refund.created ---');
        req = {
            body: {
                event: 'refund.created',
                payload: {
                    payment: {
                        entity: {
                            id: paymentId,
                            order_id: activeOrderId
                        }
                    }
                }
            }
        };
        res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { this.data = data; return this; }
        };

        await razorpayController.webhookHandler(req, res);
        console.log(`Response Code: ${res.statusCode}`);
        if (res.statusCode === 200) {
            const updatedOrder = await CourseOrder.findOne({ razorpay_order_id: activeOrderId });
            const updatedTx = await Transaction.findOne({ orderId: activeOrderId });
            if (updatedOrder.paymentStatus === 'failed' && updatedTx.status === 'refunded') {
                console.log('✅ TEST 8 PASSED: Webhook logged refund event correctly.\n');
            } else {
                throw new Error('TEST 8 FAILED: Refund state not updated');
            }
        } else {
            throw new Error('TEST 8 FAILED');
        }

        console.log('🎉 ALL BACKEND UNIT TESTS COMPLETED SUCCESSFULLY! 🎉');

    } catch (err) {
        console.error('❌ A TEST FAILED:', err.message);
    } finally {
        // Cleanup after tests
        console.log('\n🧹 Cleaning up test database records...');
        await Course.deleteMany({ $or: [{ _id: TEST_COURSE_ID }, { slug: 'premium-nodejs-mastery' }] });
        await MockTestPack.deleteMany({ $or: [{ _id: TEST_MOCK_PACK_ID }, { id: 'premium-mock-pack' }] });
        await User.deleteMany({ $or: [{ _id: TEST_USER_ID }, { googleId: 'test_google_id_123' }] });
        await CourseOrder.deleteMany({ userId: TEST_USER_ID });
        await Payment.deleteMany({ userId: TEST_USER_ID });
        await Enrollment.deleteMany({ userId: TEST_USER_ID });
        await Transaction.deleteMany({ userId: TEST_USER_ID });
        console.log('✅ Cleanup completed.');

        await mongoose.disconnect();
        console.log('🔌 Disconnected from DB.');
    }
}

runTests();
