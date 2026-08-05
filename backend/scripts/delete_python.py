import os
import sys
import sqlite3

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from database import sync_custom_problems_export

conn = sqlite3.connect(os.path.join(os.path.dirname(__file__), '..', 'coding_platform.db'))
c = conn.cursor()

c.execute("SELECT count(*) FROM custom_problems WHERE language='python'")
print('Python problems before deletion:', c.fetchone()[0])

c.execute("DELETE FROM custom_problems WHERE language='python'")
print('Deleted python problems:', c.rowcount)

# Clean up selected lists
c.execute("DELETE FROM selected_exam_problems WHERE language='python'")
c.execute("DELETE FROM candidate_selected_exam_problems WHERE language='python'")

conn.commit()
conn.close()

sync_custom_problems_export()
print('Export synced successfully.')
