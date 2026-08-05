import os

replacements = {
    'PlatformLogoOnly': 'PlatformLogoOnly',
    'PlatformLogoSmall': 'PlatformLogoSmall',
    'PlatformLogo': 'PlatformLogo',
    'Coding Platform': 'Coding Platform',
    'codingplatform.com': 'codingplatform.com',
    'meptrasoft-logo.png': 'meptrasoft-logo.png'
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements.items():
        new_content = new_content.replace(old, new)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")

for root, dirs, files in os.walk(r'c:\Users\mural\Desktop\HackerRank\HackerRank-Like-Coding-Test-Platform'):
    if 'node_modules' in root or '.git' in root or 'venv' in root or '.gemini' in root:
        continue
    for file in files:
        if file.endswith(('.js', '.jsx', '.py', '.html', '.css')):
            process_file(os.path.join(root, file))

print("Done replacing.")
