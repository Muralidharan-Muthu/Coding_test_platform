# 🚀 HackerRank-Like Coding Test Platform

A full-stack coding test platform for conducting interview rounds, built with FastAPI (Python) and React.

## ✨ Features

- **Simple Login**: Name + Gmail authentication (no password required)
- **Python Code Execution**: Real-time code execution with stdin support
- **HackerRank-Style Interface**: Split layout with problem statement and Monaco Editor
- **Multiple Submissions**: Best score tracking across multiple attempts
- **Test Case Validation**: Hidden and sample test cases
- **HR Results Dashboard**: Single-row per candidate view with best scores
- **Concurrency Control**: Handles up to 25 concurrent users
- **Future-Ready**: Architecture supports SQL problems (not yet implemented)

## 🛠️ Tech Stack

**Backend:**
- FastAPI (Python 3.9+)
- SQLite database
- Subprocess-based code execution
- Asyncio for concurrency

**Frontend:**
- React 18
- Monaco Editor (VS Code editor)
- Vite build tool
- Axios for API calls

## 📋 Prerequisites

- Python 3.9 or higher
- Node.js 18 or higher
- npm or yarn

## 🚀 Quick Start

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment (recommended):
```bash
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the backend server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 🎯 Usage

### For Candidates

1. **Login**: Enter your name and Gmail address
2. **Code**: Write your solution in the Monaco editor
3. **Run**: Test with custom input (doesn't affect score)
4. **Submit**: Run against all test cases and get scored
5. **Resubmit**: Submit multiple times - best score is saved

### For HR/Admins

Access the results endpoint to see all candidate scores:
```
GET http://localhost:8000/hr/results
```

Returns JSON with one row per candidate showing their best submission.

## 📁 Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI app and routes
│   ├── database.py          # SQLite setup and connection
│   ├── models.py            # Pydantic models
│   ├── runner.py            # Python code execution
│   ├── problems.py          # Static problem definitions
│   └── requirements.txt     # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx           # Login page
│   │   │   ├── Login.css
│   │   │   ├── CodingPage.jsx      # Main coding interface
│   │   │   └── CodingPage.css
│   │   ├── api.js                  # API client
│   │   ├── main.jsx                # App entry point
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

## 🗄️ Database Schema

**users**
- id, name, email, created_at

**submissions**
- id, user_id, problem_id, code, passed_tests, total_tests, score, created_at

**hr_results** (Best scores only)
- id, user_id, name, email, problem_id, best_score, passed_tests, total_tests, best_submission_id, updated_at

## 🔌 API Endpoints

### Authentication
- `POST /login` - Create session with name + email

### Coding
- `GET /problems/{problem_id}` - Get problem details
- `POST /run` - Execute code with custom input
- `POST /submit` - Submit code for scoring

### Admin
- `GET /hr/results` - Get all candidate results (best scores)

## 🧪 Sample Problem

**Problem**: Sum of N Numbers

Given N integers, calculate their sum.

**Starter Code:**
```python
n = int(input())
arr = list(map(int, input().split()))

# Write your code here
```

## 🔐 Security Notes

**⚠️ This is a MVP/development version. For production use:**

1. Add proper authentication (JWT, OAuth)
2. Implement code sandboxing (Docker containers)
3. Add rate limiting
4. Validate and sanitize all inputs
5. Use environment variables for configuration
6. Add HTTPS/SSL
7. Implement proper session management
8. Add monitoring and logging

## 🚢 Deployment to Hostinger VPS

### Backend Deployment

1. SSH into your VPS:
```bash
ssh user@your-vps-ip
```

2. Clone your repository:
```bash
git clone <your-repo-url>
cd <repo-name>/backend
```

3. Install Python and dependencies:
```bash
sudo apt update
sudo apt install python3-pip python3-venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

4. Run with Gunicorn (production server):
```bash
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

5. Set up as systemd service for auto-restart:
```bash
sudo nano /etc/systemd/system/coding-platform.service
```

Add:
```ini
[Unit]
Description=Coding Platform API
After=network.target

[Service]
User=your-user
WorkingDirectory=/path/to/backend
Environment="PATH=/path/to/backend/venv/bin"
ExecStart=/path/to/backend/venv/bin/gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable coding-platform
sudo systemctl start coding-platform
```

### Frontend Deployment

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Install and configure Nginx:
```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/coding-platform
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/frontend/dist;
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/coding-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔮 Future Enhancements (Not Implemented)

- SQL problem support
- Multiple programming languages
- Code plagiarism detection
- Admin dashboard for managing problems
- Real-time leaderboard
- Time limits per problem
- Video proctoring
- Code playback/replay

## 📝 License

This is a MVP project for internal use. Modify as needed for your requirements.

## 🤝 Support

For issues or questions, please contact your development team.

---

**Built for one-day deployment** ⚡
