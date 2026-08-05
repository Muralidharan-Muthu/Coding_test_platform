import os
import sys
import sqlite3

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def fix_mojibake(text):
    if not text: return text
    replacements = {
        '\u00e2\u2030\u00a4': '≤',
        '\u00e2\u20ac\u201d': '—',
        '\u00e2\u20ac\u201c': '–',
        '\u00e2\u2122': '’',
        '\u00e2\u20ac\u2122': '’',
        '\u00e2\u2020\u2019': '→',
        '\u00e2\u20ac\u0153': '“',
        '\u00e2\u20ac\u009d': '”',
        '\u00e2\u20ac\u02dc': '‘',
        '\u00e2\u20ac\u2122': '’'
    }
    for bad, good in replacements.items():
        text = text.replace(bad, good)
    return text

conn = sqlite3.connect(os.path.join(os.path.dirname(__file__), '..', 'coding_platform.db'))
c = conn.cursor()

tables = ['problems', 'custom_problems']
cols = ['title', 'statement', 'description', 'input_format', 'output_format', 'sample_input', 'sample_output']

changes = 0
for table in tables:
    c.execute(f'SELECT id, {",".join(cols)} FROM {table}')
    rows = c.fetchall()
    for row in rows:
        row_id = row[0]
        needs_update = False
        new_values = []
        for i, col_val in enumerate(row[1:]):
            if isinstance(col_val, str):
                fixed = fix_mojibake(col_val)
                if fixed != col_val:
                    needs_update = True
                    col_val = fixed
            new_values.append(col_val)
        
        if needs_update:
            set_clause = ", ".join([f"{col}=?" for col in cols])
            c.execute(f'UPDATE {table} SET {set_clause} WHERE id=?', (*new_values, row_id))
            changes += 1

conn.commit()
print(f'Fixed {changes} problems.')
conn.close()

try:
    from database import sync_custom_problems_export
    sync_custom_problems_export()
    print('Export synced.')
except Exception as e:
    print('Export failed:', e)
