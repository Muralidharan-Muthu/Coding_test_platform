# SMTP Email Configuration Guide

## Overview
This guide explains how to configure Gmail SMTP for sending candidate invitation emails with OTP codes.

## Prerequisites
- A Gmail account
- 2-Step Verification enabled on your Google account
- An App Password generated from Google

## Step-by-Step Setup

### 1. Enable 2-Step Verification
1. Go to your Google Account: https://myaccount.google.com/
2. Click on "Security" in the left sidebar
3. Under "Signing in to Google", click "2-Step Verification"
4. Follow the steps to enable 2-Step Verification

### 2. Generate App Password
1. Go to App Passwords page: https://myaccount.google.com/apppasswords
2. You may need to sign in again
3. Under "App passwords", select:
   - **Select app**: Choose "Mail" or "Other (Custom name)" → Enter "Coding Test Platform"
   - **Select device**: Choose "Windows Computer" or other
4. Click "Generate"
5. Copy the 16-character app password (it will look like: `abcd efgh ijkl mnop`)
6. **Important**: Remove spaces when using it → `abcdefghijklmnop`

### 3. Configure .env File

Open `backend/.env` and update these values:

```env
# Email Configuration for SMTP (Gmail)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop  # Your 16-char app password (no spaces)
SMTP_FROM_NAME=Coding Test Platform
```

Replace:
- `your_email@gmail.com` with your actual Gmail address
- `abcdefghijklmnop` with your generated app password

### 4. Restart Backend Server

After updating `.env`, restart the backend:

```bash
cd backend
# Stop current server (Ctrl+C)
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Testing Email Sending

### Test from HR Dashboard:
1. Navigate to HR Dashboard → Candidate Management
2. Add a candidate or use an existing one
3. Click "Generate OTP" to create an OTP
4. Click "Send Email" button
5. Check the console output and success/error messages

### Expected Behavior:
- ✅ **Success**: "Email sent successfully to [email]"
- ⚠️ **Warning** (if SMTP not configured): Shows OTP in console for manual sending
- ❌ **Error**: Detailed error message about what went wrong

## Troubleshooting

### Error: "SMTP Authentication failed"
- Double-check your Gmail address is correct
- Ensure you're using the App Password, not your regular Gmail password
- Make sure there are no spaces in the app password
- Verify 2-Step Verification is enabled

### Error: "Failed to connect to SMTP server"
- Check your internet connection
- Verify firewall isn't blocking port 587
- Try using port 465 with SSL instead (requires code change)

### Error: "Connection timed out"
- Check if your network allows outbound connections on port 587
- Some corporate networks block Gmail SMTP

### Emails going to spam
- Ask recipients to whitelist your email address
- Consider using a professional email service (SendGrid, Mailgun) for production

## Security Best Practices

1. **Never commit .env to Git** - It's already in .gitignore
2. **Use App Passwords only** - Never use your regular Gmail password
3. **Rotate passwords regularly** - Generate new app passwords periodically
4. **Monitor usage** - Check your Gmail account activity regularly

## Production Alternatives

For production use, consider these professional email services:

### SendGrid (Recommended)
- Free tier: 100 emails/day
- Better deliverability
- Analytics and tracking
- Setup: Use SendGrid SMTP settings instead of Gmail

### Amazon SES
- Very cost-effective for high volume
- Excellent deliverability
- Requires AWS account

### Mailgun
- Free tier available
- Good developer tools
- Easy integration

## Support

If you encounter issues:
1. Check backend console logs for detailed error messages
2. Verify all SMTP settings are correct
3. Test with a different email provider if possible
4. Contact support with error logs

---

**Last Updated**: 2026-03-06
**Version**: 1.0
