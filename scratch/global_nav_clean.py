import os
import re

def main():
    directory = 'public'
    for filename in os.listdir(directory):
        if filename.endswith('.html'):
            path = os.path.join(directory, filename)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Remove nav-search block
            new_content = re.sub(r'\s*<div class="nav-search"[\s\S]*?</div>', '', content)
            
            if new_content != content:
                print(f"Cleaning {filename}...")
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)

if __name__ == '__main__':
    main()
