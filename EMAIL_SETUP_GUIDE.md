# Email Configuration Guide

## Setting Up SMTP for Sending OTP Emails

The platform now supports sending OTP codes via email to candidates. Follow these steps to configure email sending:

### Step 1: Update .env File

Open the `backend/.env` file and update the SMTP configuration:

```env
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password_here
SMTP_FROM_NAME=Coding Test Platform
```

### Step 2: Gmail Setup (if using Gmail)

If you're using Gmail, follow these steps:

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the generated 16-character password
   - Use this password in `SMTP_PASSWORD`

### Step 3: Alternative SMTP Providers

You can use any SMTP provider. Here are some examples:

**Outlook/Hotmail:**
```env
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
```

**Yahoo Mail:**
```env
SMTP_SERVER=smtp.mail.yahoo.com
SMTP_PORT=465
```

**Custom SMTP Server:**
```env
SMTP_SERVER=your-smtp-server.com
SMTP_PORT=587
SMTP_USERNAME=your_username
SMTP_PASSWORD=your_password
```

### Step 4: Test Email Sending

1. Start the backend server
2. Go to HR OTP Dashboard: http://localhost:3000/hr/otp
3. Import candidates or add manually
4. Generate OTP for a candidate
5. Click "Send Email"
6. Check the backend console for email status

### Development Mode

If SMTP credentials are not configured in `.env`, the system will automatically fall back to console mode and print the email content to the terminal. This is useful for local development and testing.

### Troubleshooting

**Email not sending:**
- Check if SMTP credentials are correct
- Verify your email provider allows SMTP access
- Check firewall settings for SMTP port (587 or 465)
- For Gmail, ensure you're using an App Password, not your regular password

**Connection timeout:**
- Verify SMTP server address and port
- Check if your network allows SMTP connections
- Try using SSL port 465 instead of TLS port 587 (update `SMTP_PORT` accordingly)
