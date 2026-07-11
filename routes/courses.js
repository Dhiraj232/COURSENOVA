const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { optionalAuth } = require('../middleware/auth');

// GET /api/courses
router.get('/', optionalAuth, async (req, res) => {
    try {
        const courses = await Course.find({ isActive: true }).lean();

        // Annotate each course with the required fields
        const enrichedCourses = await Promise.all(courses.map(async (course) => {
            const count = await Enrollment.countDocuments({
                $or: [
                    { courseId: String(course._id) },
                    { courseId: course.slug }
                ]
            });
            
            // Deterministic rating based on char sum of title
            const charSum = course.title.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
            const ratingVal = (4.5 + (charSum % 5) * 0.1);

            return {
                _id: course._id,
                title: course.title,
                slug: course.slug,
                description: course.description || 'Master professional skills with our detailed course syllabus.',
                thumbnail: course.thumbnail || '/images/default-course.png',
                category: course.category || 'Tech',
                level: course.level || 'Beginner',
                language: 'English',
                price: course.price,
                discountPrice: Math.round(course.price * 2.5),
                isFree: course.isFree,
                rating: ratingVal,
                students: count,
                duration: course.duration || '4 Weeks',
                instructor: 'CourseNova Expert',
                certificate: true,
                updatedAt: course.updatedAt || course.createdAt || new Date(),
                
                // Keep icon, lessonCount, quizCount for frontends mapping from /courses directly
                icon: course.icon || '🎓',
                lessonCount: (course.lessons || []).length || 1,
                quizCount: (course.quizQuestions || []).length || 15
            };
        }));

        const freeCourses = enrichedCourses.filter(c => c.isFree || c.price === 0);
        const premiumCourses = enrichedCourses.filter(c => !c.isFree && c.price > 0);
        const featuredCourses = enrichedCourses.slice(0, 3); // Pick first 3 as featured
        const categories = [...new Set(enrichedCourses.map(c => c.category).filter(Boolean))];

        res.json({
            success: true,
            ok: true,
            courses: enrichedCourses,
            freeCourses,
            premiumCourses,
            featuredCourses,
            categories,
            totalCourses: enrichedCourses.length
        });
    } catch (err) {
        console.error('GET /api/courses error:', err);
        res.status(500).json({ success: false, ok: false, message: 'Failed to fetch courses catalog.' });
    }
});

module.exports = router;
