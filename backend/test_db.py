import sqlite3
import os

conn = sqlite3.connect(os.path.join(os.path.dirname(__file__), 'coding_platform.db'))
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Tables:", tables)

# Check candidate_otp table
try:
    cursor.execute('SELECT COUNT(*) FROM candidate_otp')
    count = cursor.fetchone()[0]
    print("Candidate count:", count)
except Exception as e:
    print("Error:", e)

conn.close()

