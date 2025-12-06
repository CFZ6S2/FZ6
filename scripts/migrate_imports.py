import os
import re

TARGET_DIR = "webapp"
CDN_PATTERN = r'https://www.gstatic.com/firebasejs/[\d\.]+/firebase-([a-z-]+)\.js'

MAPPINGS = {
    "app": "firebase/app",
    "auth": "firebase/auth",
    "firestore": "firebase/firestore",
    "storage": "firebase/storage",
    "functions": "firebase/functions",
    "app-check": "firebase/app-check",
    "messaging": "firebase/messaging",
    "analytics": "firebase/analytics"
}

def migrate_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content
    
    def replacement(match):
        module = match.group(1)
        # Handle 'app-check' special case if needed, but the regex '([a-z-]+)' captures it.
        # However, mapping keys match the captured group.
        if module in MAPPINGS:
            return MAPPINGS[module]
        return match.group(0) # No change if not in mapping

    new_content = re.sub(CDN_PATTERN, replacement, content)

    if new_content != content:
        print(f"Migrating {filepath}...")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)

def main():
    base_path = os.path.join(os.getcwd(), TARGET_DIR)
    for root, dirs, files in os.walk(base_path):
        if 'node_modules' in root:
            continue
        if 'public' in root: # Skip public folder (service workers etc might need CDN/compat)
             continue
        
        for file in files:
            if file.endswith('.html') or file.endswith('.js'):
                migrate_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
