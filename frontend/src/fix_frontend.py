import glob
import os

files = glob.glob(r'c:\Users\mural\Desktop\HackerRank\HackerRank-Like-Coding-Test-Platform\frontend\src\**\*.jsx', recursive=True)
for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        text = f.read()
    
    original_text = text
    
    replacements = {
        'â€”': '—',
        'â€“': '–',
        'â†’': '→',
        'Â·': '·',
        'âœ¨': '✨',
        'âš¡': '⚡',
        'âœ“': '✓',
        'ðŸ“‹': '📋',
        'â”€â”€': '──',
        'Â': ''
    }
    
    for bad, good in replacements.items():
        text = text.replace(bad, good)
        
    if text != original_text:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f'Fixed mojibake in {os.path.basename(fpath)}')

print('Done checking JSX files.')
