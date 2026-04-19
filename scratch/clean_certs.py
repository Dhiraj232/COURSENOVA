import re

def main():
    path = 'd:/coursenova/public/certificates.html'
    content = open(path, 'r', encoding='utf-8').read()

    # Define regex patterns for the blocks to remove
    # 1. CSS Banner
    content = re.sub(r'\s+/\* ── Progress Banner ── \*/\s+\.progress-banner \{[\s\S]*?progress-banner\.show \{[\s\S]*?\}\s+\.pbstat \{[\s\S]*?\}\s+\.pbstat strong \{[\s\S]*?\}', '', content)
    
    # 2. CSS Filter Bar
    content = re.sub(r'\s+/\* ── Filter Bar ── \*/\s+\.filter-bar \{[\s\S]*?\}\s+\.filter-chip \{[\s\S]*?\}\s+\.filter-chip\.active,[\s\S]*?\n\s+\.filter-chip:hover \{[\s\S]*?\}', '', content)
    
    # 3. HTML Progress Banner
    # We already removed the first line of the div in some cases, so let's be flexible
    content = re.sub(r'\s+<div class=\"pbstat\"><strong id=\"pbEnrolled\">0</strong> Enrolled</div>\s+<div class=\"pbstat\"><strong id=\"pbCompleted\">0</strong> Completed</div>\s+<div class=\"pbstat\"><strong id=\"pbCerts\">0</strong> Certificates 🏆</div>\s+<a href=\"certificates\.html\" style=\"background:rgba\(255,255,255,\.2\);color:white;padding:8px 20px;border-radius:20px;font-weight:700;text-decoration:none;font-size:\.88rem;\">View Dashboard →</a>\s+</div>', '', content)
    
    # 4. HTML Filter Bar
    content = re.sub(r'\s+<button class=\"filter-chip active\" onclick=\"filterCards\(\'all\', this\)\">All Courses</button>\s+<button class=\"filter-chip\" onclick=\"filterCards\(\'Beginner\', this\)\">🌱 Beginner</button>\s+<button class=\"filter-chip\" onclick=\"filterCards\(\'Intermediate\', this\)\">📈 Intermediate</button>\s+<button class=\"filter-chip\" onclick=\"filterCards\(\'completed\', this\)\">🏆 Completed</button>\s+</div>', '', content)

    # 5. JS stats update
    content = re.sub(r'\s+// Banner stats\s+if \(enrolledIds\.length > 0\) \{[\s\S]*?\}', '', content)

    # 6. JS functions
    # Using specific names to avoid over-matching
    content = re.sub(r'function renderCards\(filter\) \{[\s\S]*?\}', '', content)
    content = re.sub(r'function filterCards\(type, btn\) \{[\s\S]*?\}', '', content)

    # 7. Initial call fix
    content = content.replace("renderCards('all');", "renderGrids(COURSES);")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    main()
