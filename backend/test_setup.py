# Test Script to Verify Backend Setup

import sys
import os

print("🔍 Checking Python version...")
print(f"Python version: {sys.version}")

if sys.version_info < (3, 9):
    print("❌ Python 3.9+ required!")
    sys.exit(1)
else:
    print("✅ Python version OK")

print("\n🔍 Checking imports...")
try:
    import fastapi
    print(f"✅ FastAPI installed: {fastapi.__version__}")
except ImportError:
    print("❌ FastAPI not installed. Run: pip install -r requirements.txt")
    sys.exit(1)

try:
    import uvicorn
    print(f"✅ Uvicorn installed")
except ImportError:
    print("❌ Uvicorn not installed. Run: pip install -r requirements.txt")
    sys.exit(1)

try:
    import pydantic
    print(f"✅ Pydantic installed: {pydantic.__version__}")
except ImportError:
    print("❌ Pydantic not installed. Run: pip install -r requirements.txt")
    sys.exit(1)

print("\n🔍 Checking backend files...")
files = ["main.py", "database.py", "models.py", "runner.py", "problems.py"]
for file in files:
    if os.path.exists(file):
        print(f"✅ {file} found")
    else:
        print(f"❌ {file} missing!")
        sys.exit(1)

print("\n🔍 Testing database initialization...")
try:
    from database import init_db
    init_db()
    print("✅ Database initialized successfully")
except Exception as e:
    print(f"❌ Database initialization failed: {e}")
    sys.exit(1)

print("\n✅ ALL CHECKS PASSED!")
print("\n🚀 You can now start the server with:")
print("   uvicorn main:app --reload --host 0.0.0.0 --port 8000")
