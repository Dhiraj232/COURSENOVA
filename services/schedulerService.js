/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║           COURSENOVA — SCHEDULER SERVICE                             ║
 * ║  In-process scheduler for automated notification reminders.          ║
 * ║  Uses IST (UTC+5:30) for timing. Runs on server startup.             ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

const {
    sendDailyChallengeReminders,
    sendMockTestReminders,
    sendCourseProgressReminders
} = require('./notificationService');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30

/**
 * Get current time in IST
 */
function nowIST() {
    return new Date(Date.now() + IST_OFFSET_MS);
}

/**
 * Calculate milliseconds until next target hour/minute in IST
 * @param {number} targetHour - Hour in IST (0-23)
 * @param {number} targetMin - Minute (0-59)
 */
function msUntilIST(targetHour, targetMin = 0) {
    const now = nowIST();
    const target = new Date(now);
    target.setUTCHours(targetHour, targetMin, 0, 0);

    // If target has already passed today, schedule for tomorrow
    if (target <= now) {
        target.setUTCDate(target.getUTCDate() + 1);
    }

    return target - now;
}

/**
 * Schedule a daily job at a specific IST time.
 * Fires once at the target time, then repeats every 24 hours.
 * @param {string} name - Job name for logging
 * @param {number} hourIST - Hour in IST
 * @param {number} minIST - Minute in IST
 * @param {Function} fn - Async function to execute
 */
function scheduleDailyJob(name, hourIST, minIST, fn) {
    const delay = msUntilIST(hourIST, minIST);

    console.log(`[Scheduler] "${name}" scheduled in ${Math.round(delay / 60000)} minutes (IST ${hourIST}:${String(minIST).padStart(2, '0')})`);

    setTimeout(async () => {
        console.log(`[Scheduler] Running job: "${name}"`);
        try {
            await fn();
        } catch (err) {
            console.error(`[Scheduler] Job "${name}" failed:`, err.message);
        }

        // Reschedule for next 24 hours
        setInterval(async () => {
            console.log(`[Scheduler] Running job: "${name}"`);
            try {
                await fn();
            } catch (err) {
                console.error(`[Scheduler] Job "${name}" failed:`, err.message);
            }
        }, 24 * 60 * 60 * 1000);
    }, delay);
}

/**
 * Initialize all scheduled notification jobs.
 * Called once after server starts and MongoDB is connected.
 */
function initScheduler() {
    console.log('[Scheduler] Initializing notification schedulers...');

    // 1. Daily Challenge reminder — 8:00 AM IST
    scheduleDailyJob(
        'Daily Challenge Reminder',
        8, 0,
        sendDailyChallengeReminders
    );

    // 2. Mock Test reminder — 10:00 AM IST
    scheduleDailyJob(
        'Mock Test Reminder',
        10, 0,
        sendMockTestReminders
    );

    // 3. Course Progress reminder — every 3 days at 11:00 AM IST
    // We implement this as daily check but the dedupeKey prevents it from firing
    // more than once every 3 days per user per course
    scheduleDailyJob(
        'Course Progress Reminder',
        11, 0,
        sendCourseProgressReminders
    );

    console.log('[Scheduler] ✅ All notification schedulers active');
}

module.exports = { initScheduler };
