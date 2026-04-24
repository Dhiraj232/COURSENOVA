require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI;

// ALL 16 C Language videos (from Raj Technologies / rajonlinetrainings)
const cLessons = [
    { lessonId: 'c-l1',  title: 'C Language – Session 1',  videoUrl: 'https://www.youtube.com/embed/0sgzvckV8Kk?rel=0', pdfUrl: '', order: 1 },
    { lessonId: 'c-l2',  title: 'C Language – Session 2',  videoUrl: 'https://www.youtube.com/embed/vcXoFW5vrGQ?rel=0', pdfUrl: '', order: 2 },
    { lessonId: 'c-l3',  title: 'C Language – Session 3',  videoUrl: 'https://www.youtube.com/embed/Gme0N4nbeTs?rel=0', pdfUrl: '', order: 3 },
    { lessonId: 'c-l4',  title: 'C Language – Session 4',  videoUrl: 'https://www.youtube.com/embed/6RGNV45JAAE?rel=0', pdfUrl: '', order: 4 },
    { lessonId: 'c-l5',  title: 'C Language – Session 5',  videoUrl: 'https://www.youtube.com/embed/vfEmDDUB21s?rel=0', pdfUrl: '', order: 5 },
    { lessonId: 'c-l6',  title: 'C Language – Session 6',  videoUrl: 'https://www.youtube.com/embed/7B1tmhv0uA4?rel=0', pdfUrl: '', order: 6 },
    { lessonId: 'c-l7',  title: 'C Language – Session 7',  videoUrl: 'https://www.youtube.com/embed/EC3vKwP5dH4?rel=0', pdfUrl: '', order: 7 },
    { lessonId: 'c-l8',  title: 'C Language – Session 8',  videoUrl: 'https://www.youtube.com/embed/9yIt6wm__00?rel=0', pdfUrl: '', order: 8 },
    { lessonId: 'c-l9',  title: 'C Language – Session 9',  videoUrl: 'https://www.youtube.com/embed/byg3cN2se_8?rel=0', pdfUrl: '', order: 9 },
    { lessonId: 'c-l10', title: 'C Language – Session 10', videoUrl: 'https://www.youtube.com/embed/3iiKt4wQa_M?rel=0', pdfUrl: '', order: 10 },
    { lessonId: 'c-l11', title: 'C Language – Session 11', videoUrl: 'https://www.youtube.com/embed/gKwrjDoEjP8?rel=0', pdfUrl: '', order: 11 },
    { lessonId: 'c-l12', title: 'C Language – Session 12', videoUrl: 'https://www.youtube.com/embed/fZyEoeLHLoQ?rel=0', pdfUrl: '', order: 12 },
    { lessonId: 'c-l13', title: 'C Language – Session 13', videoUrl: 'https://www.youtube.com/embed/qsMAoR_0Nec?rel=0', pdfUrl: '', order: 13 },
    { lessonId: 'c-l14', title: 'C Language – Session 14', videoUrl: 'https://www.youtube.com/embed/P-tmJ_FzM68?rel=0', pdfUrl: '', order: 14 },
    { lessonId: 'c-l15', title: 'C Language – Session 15', videoUrl: 'https://www.youtube.com/embed/3sSX5p5vvtU?rel=0', pdfUrl: '', order: 15 },
    { lessonId: 'c-l16', title: 'C Language – Session 16', videoUrl: 'https://www.youtube.com/embed/QQSJRlRV2Ww?rel=0', pdfUrl: '', order: 16 },
];

// ALL 36 Java videos (from Raj Technologies - Java Complete Placement Course)
const javaLessons = [
    { lessonId: 'java-l1',  title: 'Best Way to Learn Java',                    videoUrl: 'https://www.youtube.com/embed/xzDsEws4X-0?rel=0', pdfUrl: '', order: 1 },
    { lessonId: 'java-l2',  title: 'Computer Fundamentals for Java',             videoUrl: 'https://www.youtube.com/embed/3sOEXQ6zH6g?rel=0', pdfUrl: '', order: 2 },
    { lessonId: 'java-l3',  title: 'Programming Fundamentals',                   videoUrl: 'https://www.youtube.com/embed/ZzcyrTi0I6o?rel=0', pdfUrl: '', order: 3 },
    { lessonId: 'java-l4',  title: 'Structured vs OOP',                          videoUrl: 'https://www.youtube.com/embed/cMSC6Y2y0_4?rel=0', pdfUrl: '', order: 4 },
    { lessonId: 'java-l5',  title: 'OOP Concepts',                               videoUrl: 'https://www.youtube.com/embed/ud_knpvl7TE?rel=0', pdfUrl: '', order: 5 },
    { lessonId: 'java-l6',  title: 'Why OOP is KEY',                              videoUrl: 'https://www.youtube.com/embed/gfR3-ODPMnE?rel=0', pdfUrl: '', order: 6 },
    { lessonId: 'java-l7',  title: 'Essential Java Concepts',                    videoUrl: 'https://www.youtube.com/embed/9fdcZLXW06c?rel=0', pdfUrl: '', order: 7 },
    { lessonId: 'java-l8',  title: 'Top Java Features',                          videoUrl: 'https://www.youtube.com/embed/z2LoPysilo4?rel=0', pdfUrl: '', order: 8 },
    { lessonId: 'java-l9',  title: 'JVM vs JRE vs JDK',                          videoUrl: 'https://www.youtube.com/embed/yHe1V86KtXU?rel=0', pdfUrl: '', order: 9 },
    { lessonId: 'java-l10', title: 'Download & Install Java 24',                 videoUrl: 'https://www.youtube.com/embed/jWbqK__EMwM?rel=0', pdfUrl: '', order: 10 },
    { lessonId: 'java-l11', title: 'Your FIRST Java App',                        videoUrl: 'https://www.youtube.com/embed/DNHExezOpSM?rel=0', pdfUrl: '', order: 11 },
    { lessonId: 'java-l12', title: 'Java in VS Code',                            videoUrl: 'https://www.youtube.com/embed/qVl31DBuAOk?rel=0', pdfUrl: '', order: 12 },
    { lessonId: 'java-l13', title: 'Comments in Java',                           videoUrl: 'https://www.youtube.com/embed/So4k5ZFUttU?rel=0', pdfUrl: '', order: 13 },
    { lessonId: 'java-l14', title: 'Keywords & Variables',                       videoUrl: 'https://www.youtube.com/embed/6yU7P0A9r10?rel=0', pdfUrl: '', order: 14 },
    { lessonId: 'java-l15', title: 'Data Types in Java',                         videoUrl: 'https://www.youtube.com/embed/B1Uv1AdyLcU?rel=0', pdfUrl: '', order: 15 },
    { lessonId: 'java-l16', title: 'Important Data Type Points',                 videoUrl: 'https://www.youtube.com/embed/06rXLC1G0N0?rel=0', pdfUrl: '', order: 16 },
    { lessonId: 'java-l17', title: 'Type Casting in Java',                       videoUrl: 'https://www.youtube.com/embed/p_jx3jiTJVE?rel=0', pdfUrl: '', order: 17 },
    { lessonId: 'java-l18', title: 'JShell Tool',                                videoUrl: 'https://www.youtube.com/embed/L0JKCsQlaZY?rel=0', pdfUrl: '', order: 18 },
    { lessonId: 'java-l19', title: 'Operators in Java',                          videoUrl: 'https://www.youtube.com/embed/PaqlySCx5iE?rel=0', pdfUrl: '', order: 19 },
    { lessonId: 'java-l20', title: 'Scanner Class – User Input',                 videoUrl: 'https://www.youtube.com/embed/Y4uSBEhPy-U?rel=0', pdfUrl: '', order: 20 },
    { lessonId: 'java-l21', title: 'Using Scanner Class',                        videoUrl: 'https://www.youtube.com/embed/C3CVtJV8Nyo?rel=0', pdfUrl: '', order: 21 },
    { lessonId: 'java-l22', title: 'Eclipse IDE Installation',                   videoUrl: 'https://www.youtube.com/embed/3LXI0_b2blM?rel=0', pdfUrl: '', order: 22 },
    { lessonId: 'java-l23', title: 'Eclipse IDE Shortcuts',                      videoUrl: 'https://www.youtube.com/embed/twtKU9TXydM?rel=0', pdfUrl: '', order: 23 },
    { lessonId: 'java-l24', title: 'if-else Statement',                          videoUrl: 'https://www.youtube.com/embed/WtUJFragyUI?rel=0', pdfUrl: '', order: 24 },
    { lessonId: 'java-l25', title: 'IF Statement Interview Q&A',                 videoUrl: 'https://www.youtube.com/embed/9keAJ8M3dh0?rel=0', pdfUrl: '', order: 25 },
    { lessonId: 'java-l26', title: 'IF-ELSE Logic for Interviews',               videoUrl: 'https://www.youtube.com/embed/RldGXEjOH4c?rel=0', pdfUrl: '', order: 26 },
    { lessonId: 'java-l27', title: 'Control Statements – if else',               videoUrl: 'https://www.youtube.com/embed/uEg-uvEecvg?rel=0', pdfUrl: '', order: 27 },
    { lessonId: 'java-l28', title: 'Switch Statement',                           videoUrl: 'https://www.youtube.com/embed/BlYDAnehbRo?rel=0', pdfUrl: '', order: 28 },
    { lessonId: 'java-l29', title: 'Switch Statement Examples',                  videoUrl: 'https://www.youtube.com/embed/i-MO07HzpWE?rel=0', pdfUrl: '', order: 29 },
    { lessonId: 'java-l30', title: 'while Loop',                                 videoUrl: 'https://www.youtube.com/embed/m3Z-DESvPiY?rel=0', pdfUrl: '', order: 30 },
    { lessonId: 'java-l31', title: 'while Loop Examples',                        videoUrl: 'https://www.youtube.com/embed/turmaj27LJw?rel=0', pdfUrl: '', order: 31 },
    { lessonId: 'java-l32', title: 'Sum of Digits Program',                      videoUrl: 'https://www.youtube.com/embed/NHeI3lTe4Io?rel=0', pdfUrl: '', order: 32 },
    { lessonId: 'java-l33', title: 'Reverse a Number',                           videoUrl: 'https://www.youtube.com/embed/RlwY_pCXRik?rel=0', pdfUrl: '', order: 33 },
    { lessonId: 'java-l34', title: 'Palindrome Check',                           videoUrl: 'https://www.youtube.com/embed/xxe2GXTkArM?rel=0', pdfUrl: '', order: 34 },
    { lessonId: 'java-l35', title: 'Digit to Words Program',                     videoUrl: 'https://www.youtube.com/embed/aC3-uhR8YzM?rel=0', pdfUrl: '', order: 35 },
    { lessonId: 'java-l36', title: 'Armstrong Number Check',                     videoUrl: 'https://www.youtube.com/embed/Ttc15Cz9B78?rel=0', pdfUrl: '', order: 36 },
];

async function updateLessons() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB connected');

        const cResult = await Course.findOneAndUpdate(
            { slug: 'c-programming-fundamentals' },
            { $set: { lessons: cLessons } },
            { new: true }
        );
        console.log(cResult ? `✅ C Programming: ${cLessons.length} lessons (ALL videos)` : '❌ C not found');

        const jResult = await Course.findOneAndUpdate(
            { slug: 'java-in-1-shot' },
            { $set: { lessons: javaLessons } },
            { new: true }
        );
        console.log(jResult ? `✅ Java: ${javaLessons.length} lessons (ALL videos)` : '❌ Java not found');

        console.log('\n🎉 Done! ALL playlist videos added step-by-step!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

updateLessons();
