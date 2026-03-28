/**
 * RENVOX AI - Certificates Page Logic
 * Handles fetching, filtering, and rendering of certificate courses.
 */

(function () {
    "use strict";

    const API_BASE = ''; // Root relative
    const USER_TOKEN = localStorage.getItem('renvoxToken') || localStorage.getItem('renvox_token') || '';

    // INITIALIZATION
    document.addEventListener('DOMContentLoaded', function () {
        loadCourseCatalog();
    });

    /**
     * Fetch all available courses from the backend
     */
    async function loadCourseCatalog() {
        const catalogGrid = document.getElementById('courseGrid');
        if (!catalogGrid) return;
        
        try {
            const authHeaders = USER_TOKEN ? { 'Authorization': 'Bearer ' + USER_TOKEN } : {};
            const response = await fetch(API_BASE + '/api/premium/courses', { headers: authHeaders });
            const result = await response.json();

            if (result.ok && Array.isArray(result.courses)) {
                displayCourses(result.courses);
            } else {
                catalogGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding: 40px;">No courses could be found. Please refresh the page.</p>';
            }
        } catch (error) {
            console.error('[Error] Catalog Loading Failed:', error);
            catalogGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding: 40px;">Connection error. Please check your internet.</p>';
        }
    }

    /**
     * Render course cards into the grid
     */
    function displayCourses(courseList) {
        const grid = document.getElementById('courseGrid');
        if (!grid) return;
        grid.innerHTML = '';

        if (courseList.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">No courses are currently available.</p>';
            return;
        }

        courseList.forEach(function (course) {
            const isFreeCourse = (course.isFree === true || Number(course.price) === 0);
            const courseId = course._id;
            const courseTitle = course.title;
            
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = 
                '<div class="card-header ' + (isFreeCourse ? 'free' : 'premium') + '">' +
                    '<div class="course-icon">' + (course.icon || '📚') + '</div>' +
                    '<h3 class="course-title">' + courseTitle + '</h3>' +
                '</div>' +
                '<div class="card-body">' +
                    '<p class="course-desc">' + (course.description || 'Master professional skills with our detailed course syllabus.') + '</p>' +
                    '<div class="card-actions">' +
                        '<button class="btn-action ' + (isFreeCourse ? 'btn-free' : 'btn-premium') + '" ' +
                                'onclick="navigateToCourse(\'' + courseId + '\')">' +
                            (isFreeCourse ? 'Start for FREE' : 'Buy Premium Path') +
                        '</button>' +
                    '</div>' +
                '</div>';
            
            grid.appendChild(card);
        });
    }

    /**
     * Handle navigation to the course player
     * @param {string} id - Course ID
     */
    window.navigateToCourse = function (id) {
        // Showing quick feedback
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = "Loading your course dashboard...";
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
        
        // Final Redirect to course.html (which the user insisted on)
        // Note: If you have a different player page like premium-course-player.html,
        // you should ensure it is correctly named or linked.
        setTimeout(function () {
            window.location.href = "course.html?course=" + encodeURIComponent(id);
        }, 400);
    };

})();
