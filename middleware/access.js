/**
 * middleware/access.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Clean Access Logic as requested by the user.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Check if the user has purchased a specific course.
 * @param {Object} user - The user document from MongoDB
 * @param {String} courseId - The ID or Slug of the course
 * @returns {Boolean}
 */
function checkCourseAccess(user, courseId) {
    if (!user) return false;
    // Check both standard and legacy fields for maximum robustness
    const list = user.purchasedCourses || user.enrolledCourses || [];
    return list.includes(courseId);
}

/**
 * Check if the user has purchased the master mock test series.
 * @param {Object} user - The user document from MongoDB
 * @returns {Boolean}
 */
function checkMockTestAccess(user) {
    if (!user) return false;
    return user.purchasedMockTest === true || user.hasMockSeriesAccess === true;
}

module.exports = {
    checkCourseAccess,
    checkMockTestAccess
};
