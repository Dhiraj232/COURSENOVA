/**
 * utils/accessControl.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified Access Control Utility for CourseNova
 * 
 * This module provides a single source of truth for determining if a user has
 * access to a specific Course or MockTestPack.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Course = require('../models/Course');
const MockTestPack = require('../models/MockTestPack');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');

/**
 * Checks if a user is enrolled in a specific item (Course or MockTestPack).
 * Supports lookup by ObjectId, Slug, or Title.
 * 
 * @param {string} userId - User's MongoDB _id or string ID
 * @param {string} itemId - id, _id, or slug of the course/mocktest
 * @returns {Promise<boolean>} - True if enrolled or the item is free
 */
async function checkAccess(userId, itemId) {
    if (!itemId) return false;
    
    try {
        // 1. Fetch the item (Course or MockTestPack)
        const isObjectId = String(itemId).match(/^[0-9a-fA-F]{24}$/);
        
        let item = null;
        let itemType = 'course';

        // Try as Course
        item = await Course.findOne({
            $or: [
                { _id: isObjectId ? itemId : null },
                { slug: String(itemId).toLowerCase().trim() },
                { title: String(itemId) }
            ]
        }).lean();

        if (!item) {
            // Try as MockTestPack
            item = await MockTestPack.findOne({
                $or: [
                    { _id: isObjectId ? itemId : null },
                    { id: String(itemId) },
                    { title: String(itemId) }
                ]
            }).lean();
            if (item) itemType = 'mock';
        }

        if (!item) {
            console.warn(`[checkAccess] Item not found: ${itemId}`);
            return false;
        }

        // 2. Free items are always open
        if (item.isFree || item.price === 0) return true;

        if (!userId) return false;

        // 3. Check official Enrollment collection
        // We check by _id, slug, and title to be thorough
        const searchOrs = [
            { courseId: String(item._id) },
            { courseId: String(item.id || item._id) },
            { courseName: item.title }
        ];
        
        const enrollment = await Enrollment.findOne({ 
            userId: String(userId), 
            $or: searchOrs
        });
        if (enrollment) return true;

        // 4. Check Master Series access (₹59 tier)
        const isUserObjectId = String(userId).match(/^[0-9a-fA-F]{24}$/);
        const user = isUserObjectId ? await User.findById(userId).lean() : await User.findOne({ email: String(userId) }).lean();
        
        if (user && (user.purchasedMockTest || user.hasMockSeriesAccess) && (itemType === 'mock' || item.category === 'State Boards')) {
            console.log(`[checkAccess] User ${userId} has Master Series access -- Unlocking ${item.title}`);
            return true;
        }

        // 5. Check purchasedCourses and legacy User.enrolledCourses array
        if (user) {
            const courseList = [...(user.purchasedCourses || []), ...(user.enrolledCourses || [])];
            if (courseList.length > 0) {
                const isMatch = courseList.some(enrolledId => {
                    const lowerId = String(enrolledId).toLowerCase();
                    return (
                        lowerId === String(item._id).toLowerCase() ||
                        (item.id && lowerId === String(item.id).toLowerCase()) ||
                        (item.slug && lowerId === String(item.slug).toLowerCase()) ||
                        lowerId === String(item.title).toLowerCase()
                    );
                });
                if (isMatch) return true;
            }
        }

        return false;
    } catch (err) {
        console.error('[checkAccess] Error:', err.message);
        return false;
    }
}

module.exports = {
    checkAccess
};
