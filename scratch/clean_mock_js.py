import re

def main():
    path = 'd:/coursenova/public/js/mock-tests.js'
    content = open(path, 'r', encoding='utf-8').read()

    # 1. Remove initialization setupFilters();
    content = content.replace('    setupFilters();\n', '')
    
    # 2. Remove setupFilters() function
    content = re.sub(r'// ─── Filter Setup ───[\s\S]*?function setupFilters\(\) \{[\s\S]*?\}\n', '', content)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    main()
