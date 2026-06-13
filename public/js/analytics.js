/**
 * COURSENOVA — Google Analytics 4 (GA4) & Microsoft Clarity Telemetry Engine
 * Centralized client-side event tracking and funnels.
 */

'use strict';

const GA_MEASUREMENT_ID = window.GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';
const CLARITY_PROJECT_ID = window.CLARITY_PROJECT_ID || 'l5u4j5q8w2'; // Placeholder

// ── 1. Google Analytics 4 (GA4) ──────────────────────────────────────────────
function initGA() {
    if (GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
        console.warn('[Analytics] GA4 G-XXXXXXXXXX is a placeholder. Configure measurement ID.');
    }
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
        cookie_flags: 'max-age=7200;secure;samesite=none'
    });
}

// ── 2. Microsoft Clarity ─────────────────────────────────────────────────────
function initClarity() {
    if (CLARITY_PROJECT_ID === 'l5u4j5q8w2') {
        console.info('[Analytics] Microsoft Clarity initialized with default placeholder ID.');
    }
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;
        t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];
        y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", CLARITY_PROJECT_ID);
}

// ── 3. Centralized Event Dispatcher ──────────────────────────────────────────
const trackEvent = (eventName, params = {}) => {
    // 1. Send to GA4
    if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, {
            ...params,
            platform: 'COURSENOVA',
            timestamp: new Date().toISOString()
        });
    }
    // 2. Send to Clarity Custom Identifier if needed
    if (typeof window.clarity === 'function') {
        window.clarity("event", eventName);
    }
    console.log(`📊 [Analytics] Event: ${eventName}`, params);
};

// ── 4. Unified Event Tracking Schema ─────────────────────────────────────────
const CourseNovaAnalytics = {
    trackLogin: (method = 'Google') => {
        trackEvent('login', { method });
    },
    trackEnrollment: (courseId, courseName, price = 0) => {
        trackEvent('course_enrollment', {
            course_id: courseId,
            course_name: courseName,
            value: Number(price),
            currency: 'INR'
        });
    },
    trackPurchase: (orderId, title, price, type = 'course') => {
        trackEvent('purchase_completed', {
            transaction_id: orderId,
            item_name: title,
            value: Number(price),
            currency: 'INR',
            item_category: type
        });
    },
    trackTestAttempt: (testId, score, status) => {
        trackEvent('test_attempt', {
            test_id: testId,
            score: Number(score),
            status: status // 'passed' | 'failed'
        });
    },
    trackCertDownload: (certId, courseName) => {
        trackEvent('certificate_download', {
            certificate_id: certId,
            course_name: courseName
        });
    },
    trackPageView: (pageName) => {
        trackEvent('page_view_custom', {
            page_title: pageName
        });
    }
};

// Initialize
initGA();
initClarity();

window.CourseNovaAnalytics = CourseNovaAnalytics;
