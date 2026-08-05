# ✅ DEPLOYMENT CHECKLIST

Use this checklist to ensure proper setup and deployment of the coding platform.

## 📋 Pre-Deployment Checks

### Development Environment

- [ ] Python 3.9+ installed (`python --version`)
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Git installed (for version control)

### Backend Setup

- [ ] Navigate to `backend/` directory
- [ ] Create virtual environment: `python -m venv venv`
- [ ] Activate virtual environment:
  - Windows: `venv\Scripts\activate`
  - Linux/Mac: `source venv/bin/activate`
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Run test script: `python test_setup.py`
- [ ] Verify all checks pass ✅

### Frontend Setup

- [ ] Navigate to `frontend/` directory
- [ ] Install dependencies: `npm install`
- [ ] Verify no errors during installation

### First Run Test

- [ ] Start backend: `uvicorn main:app --reload --host 0.0.0.0 --port 8000`
- [ ] Backend accessible at http://localhost:8000
- [ ] Check health endpoint: http://localhost:8000/health
- [ ] Start frontend: `npm run dev`
- [ ] Frontend accessible at http://localhost:3000

## 🧪 Functionality Testing

### Login Tests

- [ ] Open http://localhost:3000
- [ ] Login page loads correctly
- [ ] Enter name: "Test User"
- [ ] Enter email: "test@gmail.com"
- [ ] Click "Sign In"
- [ ] Redirects to coding page

### Coding Interface Tests

- [ ] Problem "Sum of N Numbers" displays
- [ ] Monaco Editor loads with starter code
- [ ] Sample input pre-filled
- [ ] All buttons visible (Run, Submit, Reset)

### Run Button Tests

- [ ] Complete the code: add `print(sum(arr))`
- [ ] Click "Run"
- [ ] Output shows "15" (from sample input)
- [ ] Try with custom input: `3\n10 20 30`
- [ ] Output shows "60"
- [ ] Try with error (delete code, write `print(x)`)
- [ ] Error message displays in output

### Submit Button Tests

- [ ] Complete code correctly: `print(sum(arr))`
- [ ] Click "Submit"
- [ ] Shows "Score: 100%"
- [ ] Shows "Passed: 3/3 test cases"
- [ ] No failed test cases shown

### Multiple Submission Tests

- [ ] Submit incorrect code (e.g., `print(0)`)
- [ ] Check score (should be 0%)
- [ ] Fix code and submit again
- [ ] Check score (should be 100%)
- [ ] Verify best score is saved

### Reset Code Tests

- [ ] Modify code in editor
- [ ] Click "Reset Code"
- [ ] Code returns to starter template
- [ ] Output console clears

### HR Results Tests

- [ ] Open http://localhost:8000/hr/results in browser
- [ ] JSON response displays
- [ ] Shows one entry per user
- [ ] Best score (100%) displayed
- [ ] All fields present: name, email, best_score, passed_tests, total_tests

## 🚀 Production Deployment (Hostinger VPS)

### Server Preparation

- [ ] SSH access to VPS: `ssh user@your-vps-ip`
- [ ] Update system: `sudo apt update && sudo apt upgrade -y`
- [ ] Install Python: `sudo apt install python3 python3-pip python3-venv -y`
- [ ] Install Node.js: 
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt install -y nodejs
  ```
- [ ] Install Nginx: `sudo apt install nginx -y`
- [ ] Install Git: `sudo apt install git -y`

### Backend Deployment

- [ ] Clone repository or upload files
- [ ] Navigate to backend directory
- [ ] Create virtual environment
- [ ] Install dependencies
- [ ] Install Gunicorn: `pip install gunicorn`
- [ ] Test backend: `gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000`
- [ ] Create systemd service (see README.md)
- [ ] Enable service: `sudo systemctl enable coding-platform`
- [ ] Start service: `sudo systemctl start coding-platform`
- [ ] Check status: `sudo systemctl status coding-platform`

### Frontend Deployment

- [ ] Navigate to frontend directory
- [ ] Update API URL in `src/api.js` to production URL
- [ ] Build frontend: `npm run build`
- [ ] Verify `dist/` directory created
- [ ] Configure Nginx (see README.md)
- [ ] Copy files to web root or point Nginx to `dist/`
- [ ] Test Nginx config: `sudo nginx -t`
- [ ] Restart Nginx: `sudo systemctl restart nginx`

### Domain & SSL

- [ ] Point domain to VPS IP
- [ ] Install Certbot: `sudo apt install certbot python3-certbot-nginx -y`
- [ ] Get SSL certificate: `sudo certbot --nginx -d your-domain.com`
- [ ] Verify auto-renewal: `sudo certbot renew --dry-run`

### Firewall Configuration

- [ ] Allow SSH: `sudo ufw allow 22`
- [ ] Allow HTTP: `sudo ufw allow 80`
- [ ] Allow HTTPS: `sudo ufw allow 443`
- [ ] Enable firewall: `sudo ufw enable`
- [ ] Check status: `sudo ufw status`

## 🔐 Security Hardening (Production)

### Immediate Security Tasks

- [ ] Change default SSH port
- [ ] Disable root SSH login
- [ ] Set up SSH key authentication
- [ ] Configure fail2ban
- [ ] Set up automatic security updates
- [ ] Create non-root user for application
- [ ] Set proper file permissions (644 for files, 755 for dirs)

### Application Security

- [ ] Replace in-memory sessions with Redis
- [ ] Add rate limiting (10 requests/minute per user)
- [ ] Implement code sandboxing with Docker
- [ ] Add input sanitization
- [ ] Set up logging and monitoring
- [ ] Configure backup system for database
- [ ] Add health check monitoring

## 📊 Monitoring Setup

### Essential Monitoring

- [ ] Set up application logging
- [ ] Monitor backend logs: `journalctl -u coding-platform -f`
- [ ] Monitor Nginx logs: `tail -f /var/log/nginx/access.log`
- [ ] Set up disk space alerts
- [ ] Set up CPU/RAM monitoring
- [ ] Configure error alerting (email/Slack)

### Performance Monitoring

- [ ] Monitor response times
- [ ] Track database query performance
- [ ] Monitor concurrent user count
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)

## 🧪 Post-Deployment Validation

### Smoke Tests

- [ ] Homepage loads
- [ ] Login works
- [ ] Code execution works
- [ ] Submit functionality works
- [ ] HR results accessible
- [ ] SSL certificate valid
- [ ] No console errors in browser

### Load Testing

- [ ] Test with 5 concurrent users
- [ ] Test with 10 concurrent users
- [ ] Test with 25 concurrent users (max capacity)
- [ ] Verify response times acceptable
- [ ] Check server resources (CPU, RAM)

## 📝 Documentation

### Internal Documentation

- [ ] Document server IP and credentials (securely)
- [ ] Document deployment process
- [ ] Create runbook for common issues
- [ ] Document backup and restore procedures
- [ ] Create user guide for HR team

### Access Management

- [ ] List all users with access
- [ ] Document SSH key locations
- [ ] Set up password manager for shared credentials
- [ ] Document emergency procedures

## 🎯 Go-Live Checklist

### Final Checks (Day Before)

- [ ] Full backup of database
- [ ] All tests passing
- [ ] SSL working
- [ ] Monitoring active
- [ ] Support team briefed

### Launch Day

- [ ] Announce launch time
- [ ] Monitor closely for first 2 hours
- [ ] Test with real candidate
- [ ] Verify HR can access results
- [ ] Check logs for errors
- [ ] Confirm backups running

### Post-Launch (First Week)

- [ ] Daily log review
- [ ] User feedback collection
- [ ] Performance tuning if needed
- [ ] Bug fixes deployed quickly
- [ ] Success metrics tracked

## 🆘 Troubleshooting Quick Reference

### Backend not starting
```bash
# Check logs
journalctl -u coding-platform -n 50

# Restart service
sudo systemctl restart coding-platform

# Check Python errors
cd backend && source venv/bin/activate && python main.py
```

### Frontend not loading
```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
tail -f /var/log/nginx/error.log

# Rebuild frontend
cd frontend && npm run build
```

### Database issues
```bash
# Backup database
cp backend/coding_platform.db backend/coding_platform.db.backup

# Check database
sqlite3 backend/coding_platform.db ".tables"

# Reinitialize (CAUTION: deletes data)
rm backend/coding_platform.db
# Restart backend to recreate
```

### Code execution failing
```bash
# Check Python available
which python3

# Check permissions
ls -la backend/

# Check logs for subprocess errors
journalctl -u coding-platform | grep -i error
```

## ✅ Sign-Off

- [ ] Development team approves
- [ ] QA team approves
- [ ] HR team trained
- [ ] Documentation complete
- [ ] Backup system verified
- [ ] Monitoring active
- [ ] Support plan in place

**Deployment Date:** ___________

**Deployed By:** ___________

**Approved By:** ___________

---

**Status: Ready for Production ✅**
