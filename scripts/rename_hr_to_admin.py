import os
import glob

base = r'c:\Users\mural\Desktop\HackerRank\HackerRank-Like-Coding-Test-Platform\frontend\src'
pattern1 = os.path.join(base, '**', '*.jsx')
pattern2 = os.path.join(base, '**', '*.js')

files = glob.glob(pattern1, recursive=True) + glob.glob(pattern2, recursive=True)

replacements = {
    "HR Dashboard": "Admin Dashboard",
    "HR Sign In": "Admin Sign In",
    "HR Portal": "Admin Portal",
    "hr_name": "hr_name", # Just in case we touched it before, leave keys as they are
    "'HR Dashboard'": "'Admin Dashboard'",
}

for path in files:
    try:
        with open(path, 'r', encoding='utf-8') as fh:
            content = fh.read()
            
        new_content = content
        for k, v in replacements.items():
            new_content = new_content.replace(k, v)
            
        if new_content != content:
            with open(path, 'w', encoding='utf-8') as fh:
                fh.write(new_content)
            print(f'Updated: {path}')
    except Exception as e:
        print(f'Error {path}: {e}')
print('Done.')
