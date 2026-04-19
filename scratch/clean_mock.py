import re

def main():
    path = 'd:/coursenova/public/mock-tests.html'
    content = open(path, 'r', encoding='utf-8').read()

    # 1. Remove CSS block
    content = re.sub(r'\s+\.filter-section \{[\s\S]*?\.filter-select \{[\s\S]*?\}', '', content)
    
    # 2. Remove HTML block
    content = re.sub(r'\s+<div class=\"filter-section\">[\s\S]*?</div>\s+</div>\s+</div>', '', content)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    main()
