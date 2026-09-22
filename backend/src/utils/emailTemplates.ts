/**
 * Reusable email templates for candidate notifications and invitations
 */

export interface OtpEmailParams {
  username: string;
  email: string;
  otpCode: string;
  frontendUrl?: string;
}

export function generateCandidateOtpEmailHtml({
  username,
  email,
  otpCode,
  frontendUrl = 'http://localhost:3005',
}: OtpEmailParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meptrasoft AI Technologies - Assessment Pass</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 28px; text-align: center; border-bottom: 3px solid #0d9488;">
              <div style="display: inline-block; background: rgba(255, 255, 255, 0.1); padding: 8px 16px; border-radius: 30px; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.15);">
                <span style="color: #2dd4bf; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">Official Assessment Portal</span>
              </div>
              <div style="background-color: #ffffff; border-radius: 10px; padding: 8px 16px; display: inline-block;">
                <img src="cid:meptrasoft_logo" alt="Meptrasoft AI Technologies" style="height: 44px; width: auto; max-width: 100%; display: block; margin: 0 auto;" />
              </div>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 20px; font-weight: 700;">
                Welcome, ${username}! 👋
              </h2>
              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                You have been registered for the technical assessment on the <strong>Meptrasoft Coding Platform</strong>. Use your unique credentials below to authenticate and enter your exam session.
              </p>

              <!-- Credentials Box -->
              <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #cbd5e1;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding-bottom: 6px; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Username</td>
                  </tr>
                  <tr>
                    <td style="color: #0f172a; font-size: 16px; font-weight: 700; padding-bottom: 14px;">${username}</td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 6px; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Email</td>
                  </tr>
                  <tr>
                    <td style="color: #0f172a; font-size: 16px; font-weight: 700; padding-bottom: 16px;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 8px; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">One-Time Security Passcode (OTP)</td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 12px 0;">
                      <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px dashed #059669; border-radius: 12px; padding: 16px 24px; display: inline-block;">
                        <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #047857; letter-spacing: 8px;">${otpCode}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="color: #64748b; font-size: 12px; padding-top: 8px;">
                      ⏱️ Valid for <strong>24 Hours</strong> • Do not share this OTP with anyone
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${frontendUrl}" target="_blank" style="background: linear-gradient(135deg, #0d9488 0%, #2563eb 100%); color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.35);">
                  🚀 Start Assessment Portal
                </a>
              </div>

              <!-- Guidelines Card -->
              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 16px 20px; margin-top: 24px;">
                <h4 style="color: #92400e; margin: 0 0 8px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                  📌 Important Examination Rules
                </h4>
                <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 13px; line-height: 1.6;">
                  <li>Ensure a working webcam is connected for AI proctoring verification.</li>
                  <li>Maintain a stable internet connection throughout your test duration.</li>
                  <li>Do not switch browser tabs or exit fullscreen mode during the exam.</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 28px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #0f172a; font-size: 13px; font-weight: 700; margin: 0 0 4px 0;">
                Meptrasoft AI Technologies
              </p>
              <p style="color: #64748b; font-size: 12px; margin: 0 0 12px 0;">
                Empowering Next-Generation Technical Evaluations
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.5;">
                This is an automated system notification. If you did not request this pass, please notify our team at <a href="mailto:support@meptrasoft.com" style="color: #0d9488; text-decoration: none;">support@meptrasoft.com</a>.
                <br>© ${new Date().getFullYear()} Meptrasoft AI Technologies. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
