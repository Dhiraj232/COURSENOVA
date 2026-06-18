require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Course = require('../models/Course');
const CourseProgress = require('../models/CourseProgress');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/coursenova';

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');

    // 1. Migrate "building positive attitude" course
    const c1 = await Course.findOne({ slug: 'building positive attitude' });
    if (c1) {
        console.log('Migrating course: building positive attitude');
        c1.slug = 'building-positive-attitude';
        if (c1.lessons[0]) {
            c1.lessons[0].lessonId = 'building-positive-attitude-l1';
            c1.lessons[0].order = 1;
        }
        if (c1.lessons[1]) {
            c1.lessons[1].lessonId = 'building-positive-attitude-l2';
            c1.lessons[1].order = 2;
        }
        c1.markModified('lessons');
        await c1.save();
        console.log('✅ Course slug and lessons updated');
    }

    // 2. Migrate "ai basics for beginners" course
    const c2 = await Course.findOne({ slug: 'ai basics for beginners' });
    if (c2) {
        console.log('Migrating course: ai basics for beginners');
        c2.slug = 'ai-basics-beginners';
        if (c2.lessons[0]) {
            c2.lessons[0].lessonId = 'ai-basics-beginners-l1';
            c2.lessons[0].order = 1;
        }
        c2.markModified('lessons');
        await c2.save();
        console.log('✅ Course slug and lessons updated');
    }

    // 3. Find all progress records and normalize courseId to Object ID
    const progressList = await CourseProgress.find({});
    console.log(`\nNormalizing ${progressList.length} progress records...`);

    const recordsMap = {}; // key: userId_courseObjectId -> array of records

    for (const p of progressList) {
        // Resolve the course
        const courseIdStr = p.courseId;
        const orQuery = [
            { slug: courseIdStr },
            { title: courseIdStr }
        ];
        if (mongoose.Types.ObjectId.isValid(courseIdStr)) {
            orQuery.push({ _id: courseIdStr });
        }

        const course = await Course.findOne({ $or: orQuery });
        if (!course) {
            console.log(`⚠️ Course not found in DB for progress record of courseId: ${courseIdStr}`);
            continue;
        }

        const normCourseId = String(course._id);
        
        // Map completed lessons to new format
        let completed = p.completedLessons || [];
        const newCompleted = [];
        for (const l of completed) {
            if (l === 'Building Positive Attitude') {
                newCompleted.push('building-positive-attitude-l1');
                newCompleted.push('building-positive-attitude-l2');
            } else if (l === 'AI Basics for Beginners L1' || l === 'AI-Basics-Beginners - L1') {
                newCompleted.push('ai-basics-beginners-l1');
            } else {
                newCompleted.push(l);
            }
        }
        // Deduplicate
        p.completedLessons = [...new Set(newCompleted)];

        // Update progress percentage dynamically
        if (course.lessons && course.lessons.length > 0) {
            const lessonPct = (p.completedLessons.length / course.lessons.length) * 80;
            const testPct = p.testPassed ? 20 : 0;
            p.progressPercent = Math.min(100, Math.round(lessonPct + testPct));
        }

        p.courseId = normCourseId;
        p.markModified('completedLessons');

        const key = `${p.userId}_${normCourseId}`;
        if (!recordsMap[key]) {
            recordsMap[key] = [];
        }
        recordsMap[key].push(p);
    }

    console.log('\nMerging duplicate records if any...');
    for (const key in recordsMap) {
        const records = recordsMap[key];
        if (records.length === 1) {
            const p = records[0];
            await p.save();
        } else {
            console.log(`Merging ${records.length} duplicate progress records for key: ${key}`);
            // Merge them into the first record
            const primary = records[0];
            let allCompletedLessons = [];
            let allCompletedVideos = [];
            let allCompletedTests = [];
            let videoWatched = false;
            let pdfRead = false;
            let testPassed = false;
            let maxScore = 0;
            let isCompleted = false;
            let certId = null;
            let earnedAt = null;

            for (const r of records) {
                allCompletedLessons.push(...(r.completedLessons || []));
                allCompletedVideos.push(...(r.completedVideos || []));
                allCompletedTests.push(...(r.completedTests || []));
                if (r.videoWatched) videoWatched = true;
                if (r.pdfRead) pdfRead = true;
                if (r.testPassed) testPassed = true;
                if (r.score > maxScore) maxScore = r.score;
                if (r.isCompleted) isCompleted = true;
                if (r.certId) certId = r.certId;
                if (r.earnedAt) earnedAt = r.earnedAt;
            }

            primary.completedLessons = [...new Set(allCompletedLessons)];
            primary.completedVideos = [...new Set(allCompletedVideos)];
            primary.completedTests = [...new Set(allCompletedTests)];
            primary.videoWatched = videoWatched;
            primary.pdfRead = pdfRead;
            primary.testPassed = testPassed;
            primary.score = maxScore;
            primary.isCompleted = isCompleted;
            primary.certId = certId;
            primary.earnedAt = earnedAt;

            // Recalculate progressPercent
            const course = await Course.findById(primary.courseId);
            if (course && course.lessons && course.lessons.length > 0) {
                const lessonPct = (primary.completedLessons.length / course.lessons.length) * 80;
                const testPct = primary.testPassed ? 20 : 0;
                primary.progressPercent = Math.min(100, Math.round(lessonPct + testPct));
            }

            primary.markModified('completedLessons');
            primary.markModified('completedVideos');
            primary.markModified('completedTests');
            await primary.save();

            // Delete the other records
            for (let i = 1; i < records.length; i++) {
                await CourseProgress.deleteOne({ _id: records[i]._id });
            }
            console.log('✅ Merge complete');
        }
    }

    console.log('\nMigration run completed successfully!');
    await mongoose.disconnect();
}

run().catch(console.error);
