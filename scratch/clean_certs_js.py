import re

def main():
    path = 'd:/coursenova/public/certificates.html'
    content = open(path, 'r', encoding='utf-8').read()

    # 1. Add setupFilters function before renderGrids
    setup_filters_code = """
        function setupFilters() {
            const searchInp = document.getElementById('courseSearch');
            const catSel    = document.getElementById('categoryFilter');
            const levelSel  = document.getElementById('levelFilter');

            if (!searchInp) return;

            const apply = () => {
                const s = searchInp.value.toLowerCase();
                const c = catSel.value;
                const l = levelSel.value;

                const filtered = COURSES.filter(course => {
                    const matchSearch = course.title.toLowerCase().includes(s) || (course.description || '').toLowerCase().includes(s);
                    const matchCat    = !c || course.category === c;
                    const matchLevel  = !l || course.level === l;
                    return matchSearch && matchCat && matchLevel;
                });
                renderGrids(filtered);
            };

            searchInp.addEventListener('input', apply);
            catSel.addEventListener('change', apply);
            levelSel.addEventListener('change', apply);
        }
"""
    content = content.replace('        function renderGrids(coursesList) {', setup_filters_code + '\n        function renderGrids(coursesList) {')

    # 2. Update the DOMContentLoaded block
    old_init = r'const searchQuery = urlParams\.get\(\'search\'\);\s+if \(searchQuery\) \{[\s\S]*?renderGrids\(filtered\);\s+document\.querySelectorAll\(\'\.filter-chip\'\)\.forEach\(b => b\.classList\.remove\(\'active\'\)\);\s+\} else \{\s+renderGrids\(COURSES\);\s+\}'
    new_init = """setupFilters();
            
            // Handle URL search param if present
            const searchQuery = urlParams.get('search');
            if (searchQuery) {
                const searchInp = document.getElementById('courseSearch');
                if (searchInp) {
                    searchInp.value = searchQuery;
                    searchInp.dispatchEvent(new Event('input'));
                }
            } else {
                renderGrids(COURSES);
            }"""
    
    content = re.sub(old_init, new_init, content)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    main()
