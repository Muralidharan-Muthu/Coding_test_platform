# 🔧 TROUBLESHOOTING GUIDE

Common issues and their solutions for the Coding Test Platform.

---

## 🚨 Backend Issues

### Issue: Backend won't start

**Symptom:**
```
Error: No module named 'fastapi'
```

**Solution:**
```bash
cd backend
# Make sure you're in virtual environment
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Reinstall dependencies
pip install -r requirements.txt
```

---

### Issue: Port 8000 already in use

**Symptom:**
```
Error: [Errno 10048] Only one usage of each socket address
```

**Solution:**
```bash
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process (Windows)
taskkill /PID <process_id> /F

# Or use a different port
uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

---

### Issue: Database initialization fails

**Symptom:**
```
sqlite3.OperationalError: unable to open database file
```

**Solution:**
```bash
# Check directory permissions
cd backend

# Create database manually
python -c "from database import init_db; init_db()"

# Check if database file created
ls -la coding_platform.db  # Linux/Mac
dir coding_platform.db     # Windows
```

---

### Issue: Python subprocess execution fails

**Symptom:**
```
FileNotFoundError: [Errno 2] No such file or directory: 'python'
```

**Solution:**
```python
# Edit runner.py, change:
'python', '-c', code

# To:
'python3', '-c', code  # Linux/Mac
# Or
sys.executable, '-c', code  # Universal
```

---

## 🎨 Frontend Issues

### Issue: Frontend won't start

**Symptom:**
```
Error: Cannot find module 'vite'
```

**Solution:**
```bash
cd frontend

# Remove node_modules
rm -rf node_modules  # Linux/Mac
rmdir /s node_modules  # Windows

# Clear npm cache
npm cache clean --force

# Reinstall
npm install
```

---

### Issue: Monaco Editor not loading

**Symptom:**
Blank white screen where editor should be

**Solution:**
```bash
# Check browser console for errors
# Usually due to missing dependency

cd frontend
npm install @monaco-editor/react --save

# Clear browser cache and reload
# Ctrl + Shift + R (Windows)
# Cmd + Shift + R (Mac)
```

---

### Issue: API calls failing with CORS error

**Symptom:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution 1: Check backend is running**
```bash
# Backend must be on http://localhost:8000
curl http://localhost:8000/health
```

**Solution 2: Update CORS settings in main.py**
```python
# In backend/main.py, ensure:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### Issue: Vite dev server crashes

**Symptom:**
```
Error: ENOSPC: System limit for number of file watchers reached
```

**Solution (Linux):**
```bash
# Increase file watcher limit
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## 🔐 Authentication Issues

### Issue: Login fails with "Invalid session"

**Symptom:**
User logs in but immediately gets logged out

**Solution:**
```javascript
// Check localStorage in browser console
localStorage.getItem('session_id')

// Clear and try again
localStorage.clear()
location.reload()
```

---

### Issue: Email validation rejecting valid Gmail

**Symptom:**
"Email must end with @gmail.com" for valid Gmail address

**Solution:**
```python
# Check models.py validator
@validator('email')
def validate_gmail(cls, v):
    if not v.lower().endswith('@gmail.com'):  # Add .lower()
        raise ValueError('Email must end with @gmail.com')
    return v.lower()
```

---

## 💻 Code Execution Issues

### Issue: Code execution timeout

**Symptom:**
All code submissions timeout after 2 seconds

**Solution:**
```python
# Edit runner.py to increase timeout
class PythonRunner:
    TIMEOUT = 5  # Increase from 2 to 5 seconds
```

---

### Issue: Code execution returns empty output

**Symptom:**
Code runs but no output shown

**Solution:**
```python
# Check if code includes print statement
n = int(input())
arr = list(map(int, input().split()))
print(sum(arr))  # ← Must have this!
```

---

### Issue: Input not being read correctly

**Symptom:**
```
ValueError: invalid literal for int() with base 10: ''
```

**Solution:**
```python
# Check custom input format
# Must have newline between N and numbers:
5
1 2 3 4 5

# NOT:
5 1 2 3 4 5
```

---

### Issue: Concurrent execution limit reached

**Symptom:**
All requests hang, no response

**Solution:**
```python
# Check semaphore in main.py
execution_semaphore = asyncio.Semaphore(25)

# Increase if needed (server-dependent)
execution_semaphore = asyncio.Semaphore(50)

# Or add timeout for waiting
async with asyncio.timeout(30):
    async with execution_semaphore:
        # execute code
```

---

## 📊 Database Issues

### Issue: Duplicate key error on submission

**Symptom:**
```
UNIQUE constraint failed: hr_results.user_id, problem_id
```

**Solution:**
This is normal - the code should handle it with `INSERT OR REPLACE`.
Check main.py submit endpoint:
```python
cursor.execute(
    """INSERT OR REPLACE INTO hr_results 
    ...
```

---

### Issue: Best score not updating

**Symptom:**
User submits better solution but HR results show old score

**Solution:**
```python
# Check logic in main.py submit endpoint
if existing is None or score > existing[0]:
    # Update hr_results
    
# Debug: Print scores
print(f"New score: {score}, Old score: {existing[0] if existing else None}")
```

---

### Issue: Database locked error

**Symptom:**
```
sqlite3.OperationalError: database is locked
```

**Solution:**
```bash
# Stop all backend instances
# Kill any hung Python processes

# Check for .db-journal file
ls backend/*.db*

# Remove if exists
rm backend/coding_platform.db-journal

# Restart backend
```

---

## 🌐 Deployment Issues

### Issue: Backend works locally but not on VPS

**Symptom:**
502 Bad Gateway on production

**Solution:**
```bash
# Check backend service status
sudo systemctl status coding-platform

# Check logs
journalctl -u coding-platform -n 100

# Common issues:
# 1. Virtual environment path wrong in service file
# 2. Port already in use
# 3. Database permissions

# Test backend directly
cd /path/to/backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

### Issue: Frontend shows blank page on production

**Symptom:**
Homepage loads but shows white screen

**Solution:**
```bash
# Check browser console for errors
# Usually API URL issue

# Update src/api.js for production:
const API_BASE_URL = 'https://your-domain.com/api'
# NOT: http://localhost:8000

# Rebuild
npm run build

# Check Nginx proxy configuration
sudo nginx -t
sudo systemctl restart nginx
```

---

### Issue: SSL certificate errors

**Symptom:**
```
NET::ERR_CERT_AUTHORITY_INVALID
```

**Solution:**
```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates

# Force renewal if needed
sudo certbot renew --force-renewal

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🎯 Performance Issues

### Issue: Backend responds slowly

**Symptom:**
Every request takes 5+ seconds

**Solution:**
```bash
# Check server resources
top
htop  # if installed

# Check disk space
df -h

# Check database size
du -sh backend/coding_platform.db

# If database too large, archive old submissions
sqlite3 backend/coding_platform.db "DELETE FROM submissions WHERE created_at < date('now', '-30 days')"
```

---

### Issue: Too many concurrent users

**Symptom:**
Platform becomes unresponsive with 25+ users

**Solution:**
```bash
# Scale backend with more workers
gunicorn main:app -w 8 -k uvicorn.workers.UvicornWorker

# Increase semaphore limit
# Edit main.py:
execution_semaphore = asyncio.Semaphore(50)

# Or add load balancer with multiple backend instances
```

---

## 🧪 Testing Issues

### Issue: Test cases not running

**Symptom:**
Submit always shows 0/3 tests passed

**Solution:**
```python
# Check problems.py test case format
"test_cases": [
    {
        "input": "5\n1 2 3 4 5",  # Must include \n
        "output": "15"  # Exact string match
    }
]

# Check output comparison in main.py
expected_output = test_case["output"].strip()
actual_output = result["stdout"].strip()

# Debug: Print both
print(f"Expected: '{expected_output}'")
print(f"Actual: '{actual_output}'")
```

---

### Issue: All submissions fail with error

**Symptom:**
Even correct code shows errors

**Solution:**
```python
# Check runner.py error handling
if process.returncode == 0:
    return {"status": "success", ...}
else:
    return {"status": "error", ...}

# Test Python execution manually
python -c "print('test')"

# Check antivirus not blocking subprocess
```

---

## 📱 Browser Issues

### Issue: Monaco Editor freezes browser

**Symptom:**
Browser becomes unresponsive when typing

**Solution:**
```javascript
// Reduce Monaco features in CodingPage.jsx
<Editor
  options={{
    minimap: { enabled: false },  // Disable minimap
    quickSuggestions: false,      // Disable suggestions
    wordBasedSuggestions: false,
    parameterHints: { enabled: false },
  }}
/>
```

---

### Issue: Session lost on page refresh

**Symptom:**
User redirected to login after refresh

**Solution:**
```javascript
// Check localStorage persistence
useEffect(() => {
  const sessionId = localStorage.getItem('session_id')
  if (!sessionId) {
    navigate('/login')
  }
}, [])

// Verify localStorage not cleared by browser
// Check browser privacy settings
```

---

## 🔍 Debugging Tips

### Enable debug mode

**Backend:**
```python
# In main.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

**Frontend:**
```javascript
// Add console logs
console.log('API call:', response.data)
```

### Check API requests

**Using curl:**
```bash
# Test login
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@gmail.com"}' -v

# Test run
curl -X POST http://localhost:8000/run \
  -H "Content-Type: application/json" \
  -d '{"code":"print(1+1)","custom_input":""}' -v
```

**Using browser DevTools:**
- F12 → Network tab
- Watch all API calls
- Check request/response

---

## 🆘 Emergency Procedures

### Platform is completely down

1. Check backend: `sudo systemctl status coding-platform`
2. Check Nginx: `sudo systemctl status nginx`
3. Check logs: `journalctl -xe`
4. Restart services:
   ```bash
   sudo systemctl restart coding-platform
   sudo systemctl restart nginx
   ```
5. If still down, check disk space: `df -h`

### Data corruption suspected

1. Stop backend immediately
2. Backup database: `cp coding_platform.db coding_platform.db.emergency`
3. Check database integrity:
   ```bash
   sqlite3 coding_platform.db "PRAGMA integrity_check;"
   ```
4. Restore from backup if needed

---

## 📞 Getting Help

**Before asking for help, collect:**
- Error message (full text)
- Steps to reproduce
- Browser console output (F12)
- Backend logs
- System information (OS, Python version, Node version)

**Log locations:**
- Backend: `journalctl -u coding-platform -n 100`
- Nginx: `/var/log/nginx/error.log`
- Browser: F12 → Console tab

---

**Last Updated:** 2026-01-04
