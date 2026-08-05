# 🚀 QUICK START GUIDE

## ⚡ Fastest Way to Run (Windows)

### Option 1: Use the batch scripts

1. **Start Backend** (in one terminal):
   ```
   start-backend.bat
   ```

2. **Start Frontend** (in another terminal):
   ```
   start-frontend.bat
   ```

3. Open browser: http://localhost:3000

### Option 2: Manual start

**Terminal 1 - Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 📝 Testing the Platform

1. **Login Page**
   - Name: John Doe
   - Email: test@gmail.com
   - Click "Sign In"

2. **Coding Page**
   - You'll see the "Sum of N Numbers" problem
   - Starter code is pre-filled
   - Sample input is pre-loaded

3. **Test Run Button**
   - Click "Run" to execute with custom input
   - Output appears at bottom
   - This does NOT save or score

4. **Test Submit Button**
   - Complete the code (add: `print(sum(arr))`)
   - Click "Submit"
   - See score and test case results

5. **Test Multiple Submissions**
   - Modify code
   - Submit again
   - Only best score is kept for HR

6. **View HR Results**
   - Open: http://localhost:8000/hr/results
   - See JSON with all candidate best scores

## ✅ Working Solution

Complete code for the problem:
```python
n = int(input())
arr = list(map(int, input().split()))

# Write your code here
print(sum(arr))
```

## 🔧 Troubleshooting

**Backend won't start:**
- Ensure Python 3.9+ is installed: `python --version`
- Check port 8000 is not in use

**Frontend won't start:**
- Ensure Node.js 18+ is installed: `node --version`
- Delete node_modules and run `npm install` again

**CORS errors:**
- Backend must be running on port 8000
- Frontend must be running on port 3000

**Code execution fails:**
- Ensure Python is in system PATH
- Check antivirus isn't blocking subprocess

## 📊 API Testing (Postman/curl)

**Login:**
```bash
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@gmail.com"}'
```

**Get Problem:**
```bash
curl http://localhost:8000/problems/sum_n_numbers
```

**Run Code:**
```bash
curl -X POST http://localhost:8000/run \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"Hello\")", "custom_input": ""}'
```

**HR Results:**
```bash
curl http://localhost:8000/hr/results
```

## 🎯 Next Steps

1. Add more problems in `backend/problems.py`
2. Customize the UI theme
3. Add admin panel for problem management
4. Deploy to Hostinger VPS (see README.md)

---

**Need Help?** Check the full README.md for detailed documentation.
