/**
 * RENVOX AI - Google Analytics 4 (GA4) Helper
 * 
 * This script provides a centralized way to track user events.
 * Replace 'G-XXXXXXXXXX' with your actual GA4 Measurement ID.
 */

const GA_MEASUREMENT_ID = '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';

// Initialize GA4
function initGA() {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID);
}

// Event Tracking Helper
const trackEvent = (eventName, params = {}) => {
    if (typeof gtag === 'function') {
        gtag('event', eventName, {
            ...params,
            platform: 'RENVOX_AI',
            timestamp: new Date().toISOString()
        });
        console.log(`[Analytics] Tracked: ${eventName}`, params);
    }
};

// Standard Events for RENVOX AI
const RenvoxAnalytics = {
    trackLogin: (method = 'Google') => {
        trackEvent('login', { method });
    },
    trackEnrollment: (courseId, courseName) => {
        trackEvent('course_enrollment', {
            course_id: courseId,
            course_name: courseName,
            value: 0, // Free or value if paid
            currency: 'INR'
        });
    },
    trackTestAttempt: (testId, score, status) => {
        trackEvent('test_attempt', {
            test_id: testId,
            score: score,
            status: status // 'passed' or 'failed'
        });
    },
    trackCertDownload: (certId, courseName) => {
        trackEvent('certificate_download', {
            certificate_id: certId,
            course_name: courseName
        });
    }
};

// Initialize on load
initGA();
window.RenvoxAnalytics = RenvoxAnalytics;
