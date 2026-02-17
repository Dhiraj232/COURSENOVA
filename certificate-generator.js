/**
 * RENVOX - Certificate Generation System
 * Generates downloadable certificates for completed courses
 * Uses HTML5 Canvas for certificate creation
 * 
 * @version 1.0.0
 * @author RENVOX Team
 */

// Certificate template configuration
const CERTIFICATE_CONFIG = {
    width: 1200,
    height: 800,
    backgroundColor: '#ffffff',
    borderColor: '#1e3a8a',
    accentColor: '#f59e0b'
};

// Sample completed courses (in real app, this comes from database)
let completedCourses = JSON.parse(localStorage.getItem('completedCourses')) || [
    {
        courseName: 'C Programming Fundamentals',
        completionDate: '2025-01-15',
        studentName: 'John Doe',
        certificateId: 'RENV-2025-CP-001',
        grade: 'A+'
    },
    {
        courseName: 'Data Structures Advanced',
        completionDate: '2025-01-20',
        studentName: 'John Doe',
        certificateId: 'RENV-2025-DS-002',
        grade: 'A'
    }
];

// Initialize certificate system
document.addEventListener('DOMContentLoaded', function() {
    loadCompletedCourses();
    setupCertificateGeneration();
});

/**
 * Load completed courses and display them
 */
function loadCompletedCourses() {
    const coursesContainer = document.getElementById('completedCourses');
    if (!coursesContainer) return;

    if (completedCourses.length === 0) {
        coursesContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-light);">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🎓</div>
                <h3 style="color: var(--text-dark);">No certificates yet</h3>
                <p>Complete a course to earn your first certificate!</p>
                <a href="certificates.html" class="btn-enroll" style="display: inline-block; margin-top: 1rem; text-decoration: none;">
                    Browse Courses
                </a>
            </div>
        `;
        return;
    }

    coursesContainer.innerHTML = completedCourses.map((course, index) => `
        <div class="cert-card" style="animation: fadeIn 0.3s ease ${index * 0.1}s backwards;">
            <div class="cert-card-header">
                <div class="cert-icon">🎓</div>
                <h3 class="cert-card-title">${course.courseName}</h3>
            </div>
            <div class="cert-card-body">
                <div class="cert-info">
                    <div class="info-item">
                        <span class="info-label">📅 Completed</span>
                        <span class="info-value">${formatDate(course.completionDate)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">🏆 Grade</span>
                        <span class="info-value" style="color: var(--accent-color); font-weight: 800;">${course.grade}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">🔐 Certificate ID</span>
                        <span class="info-value" style="font-size: 0.85rem;">${course.certificateId}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 1rem; flex-direction: column;">
                    <button class="btn-enroll" onclick="generateCertificate(${index})">
                        <i class="fas fa-download"></i> Download Certificate
                    </button>
                    <button class="btn-enroll" style="background: #8b5cf6;" onclick="shareCertificate(${index})">
                        <i class="fas fa-share"></i> Share Certificate
                    </button>
                    <button class="btn-enroll" style="background: var(--accent-color);" onclick="verifyCertificate('${course.certificateId}')">
                        <i class="fas fa-check-circle"></i> Verify
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-IN', options);
}

/**
 * Generate and download certificate
 */
function generateCertificate(index) {
    const course = completedCourses[index];
    
    // Create canvas for certificate
    const canvas = document.createElement('canvas');
    canvas.width = CERTIFICATE_CONFIG.width;
    canvas.height = CERTIFICATE_CONFIG.height;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = CERTIFICATE_CONFIG.borderColor;
    ctx.lineWidth = 20;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    // Inner border
    ctx.strokeStyle = CERTIFICATE_CONFIG.accentColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

    // Header decoration
    ctx.fillStyle = CERTIFICATE_CONFIG.borderColor;
    ctx.fillRect(50, 50, canvas.width - 100, 8);

    // Logo area
    ctx.font = 'bold 60px Poppins, sans-serif';
    ctx.fillStyle = CERTIFICATE_CONFIG.borderColor;
    ctx.textAlign = 'center';
    ctx.fillText('📚 RENVOX', canvas.width / 2, 150);

    // Certificate title
    ctx.font = 'bold 50px Poppins, sans-serif';
    ctx.fillStyle = '#1f2937';
    ctx.fillText('CERTIFICATE OF COMPLETION', canvas.width / 2, 230);

    // Decorative line
    ctx.strokeStyle = CERTIFICATE_CONFIG.accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(300, 260);
    ctx.lineTo(900, 260);
    ctx.stroke();

    // Presented to text
    ctx.font = '20px Inter, sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText('This is to certify that', canvas.width / 2, 320);

    // Student name
    ctx.font = 'bold 50px Poppins, sans-serif';
    ctx.fillStyle = CERTIFICATE_CONFIG.borderColor;
    ctx.fillText(course.studentName, canvas.width / 2, 380);

    // Name underline
    ctx.strokeStyle = CERTIFICATE_CONFIG.accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(400, 400);
    ctx.lineTo(800, 400);
    ctx.stroke();

    // Has successfully completed
    ctx.font = '20px Inter, sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText('has successfully completed the course', canvas.width / 2, 450);

    // Course name
    ctx.font = 'bold 36px Poppins, sans-serif';
    ctx.fillStyle = '#1f2937';
    ctx.fillText(course.courseName, canvas.width / 2, 510);

    // Date and Grade
    ctx.font = '18px Inter, sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(`Completed on: ${formatDate(course.courseName)}`, canvas.width / 2 - 200, 580);
    
    ctx.fillText(`Grade: ${course.grade}`, canvas.width / 2 + 200, 580);

    // Certificate ID
    ctx.font = '14px Inter, sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(`Certificate ID: ${course.certificateId}`, canvas.width / 2, 650);

    // Footer decoration
    ctx.fillStyle = CERTIFICATE_CONFIG.borderColor;
    ctx.fillRect(50, canvas.height - 100, canvas.width - 100, 4);

    // Signature area
    ctx.font = 'italic 18px Poppins, sans-serif';
    ctx.fillStyle = '#6b7280';
    
    // Director signature
    ctx.textAlign = 'left';
    ctx.fillText('_________________________', 200, canvas.height - 130);
    ctx.font = 'bold 16px Poppins, sans-serif';
    ctx.fillText('Dr. Raj Kumar', 200, canvas.height - 100);
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText('Director, RENVOX', 200, canvas.height - 80);

    // Principal signature
    ctx.textAlign = 'right';
    ctx.font = 'italic 18px Poppins, sans-serif';
    ctx.fillText('_________________________', canvas.width - 200, canvas.height - 130);
    ctx.font = 'bold 16px Poppins, sans-serif';
    ctx.fillText('Prof. Sarah Johnson', canvas.width - 200, canvas.height - 100);
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText('Academic Head', canvas.width - 200, canvas.height - 80);

    // Verification text
    ctx.textAlign = 'center';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('Verify at: renvox.com/verify | This certificate is verifiable online', canvas.width / 2, canvas.height - 40);

    // Convert to image and download
    const link = document.createElement('a');
    link.download = `Certificate-${course.courseName.replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    // Show success message
    showToast('Certificate downloaded successfully! 🎓', 'success');
}

/**
 * Share certificate
 */
function shareCertificate(index) {
    const course = completedCourses[index];
    const shareText = `I just completed "${course.courseName}" on RENVOX with grade ${course.grade}! 🎓\n\nCertificate ID: ${course.certificateId}\n\nVerify: renvox.com/verify`;
    
    if (navigator.share) {
        navigator.share({
            title: 'My RENVOX Certificate',
            text: shareText,
            url: window.location.href
        }).catch(err => console.log('Share cancelled'));
    } else {
        // Copy to clipboard fallback
        navigator.clipboard.writeText(shareText).then(() => {
            showToast('Certificate details copied to clipboard!', 'success');
        }).catch(() => {
            alert(shareText);
        });
    }
}

/**
 * Verify certificate
 */
function verifyCertificate(certificateId) {
    const verified = completedCourses.some(c => c.certificateId === certificateId);
    
    if (verified) {
        showToast('✅ Certificate verified successfully!', 'success');
    } else {
        showToast('❌ Certificate not found in database', 'error');
    }
}

/**
 * Complete a course and generate certificate (for testing)
 */
function completeCourse(courseName) {
    const certificateId = 'RENV-' + new Date().getFullYear() + '-' + 
        courseName.substring(0, 2).toUpperCase() + '-' + 
        Math.floor(Math.random() * 10000).toString().padStart(3, '0');
    
    const grades = ['A+', 'A', 'A-', 'B+', 'B'];
    const grade = grades[Math.floor(Math.random() * grades.length)];
    
    const newCourse = {
        courseName: courseName,
        completionDate: new Date().toISOString().split('T')[0],
        studentName: localStorage.getItem('userName') || 'Student',
        certificateId: certificateId,
        grade: grade
    };
    
    completedCourses.push(newCourse);
    localStorage.setItem('completedCourses', JSON.stringify(completedCourses));
    
    showToast(`🎉 Course completed! Certificate generated: ${certificateId}`, 'success');
    loadCompletedCourses();
}

/**
 * Setup certificate generation UI
 */
function setupCertificateGeneration() {
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-weight: 600;
    `;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Export functions for global use
window.generateCertificate = generateCertificate;
window.shareCertificate = shareCertificate;
window.verifyCertificate = verifyCertificate;
window.completeCourse = completeCourse;
window.loadCompletedCourses = loadCompletedCourses;

console.log('✅ Certificate Generation System Loaded');
