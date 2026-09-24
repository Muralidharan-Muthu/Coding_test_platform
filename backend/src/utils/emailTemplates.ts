/**
 * Reusable email templates for candidate notifications and invitations
 */

export interface OtpEmailParams {
  username: string;
  email: string;
  otpCode: string;
  frontendUrl?: string;
  testType?: string;
}

export function generateCandidateOtpEmailHtml({
  username,
  email,
  otpCode,
  frontendUrl = 'http://localhost:3005',
  testType,
}: OtpEmailParams): string {
  const assessmentTypeLabel = testType
    ? `${testType.charAt(0).toUpperCase() + testType.slice(1)} Technical Assessment`
    : 'Technical Assessment';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meptrasoft AI Technologies - Assessment Access Pass</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0f172a; padding: 36px 24px 28px 24px; text-align: center; border-bottom: 3px solid #ffa116;">
              <!-- Centered Logo Card -->
              <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="background-color: #ffffff; border-radius: 8px; padding: 10px 22px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);">
                    <img src="cid:meptrasoft_logo" alt="Meptrasoft AI Technologies" style="height: 42px; width: auto; max-width: 220px; display: block; margin: 0 auto; border: 0;" />
                  </td>
                </tr>
              </table>
              
              <!-- Subtitle Badge Below Logo -->
              <div style="text-align: center; margin-top: 14px;">
                <span style="display: inline-block; color: #ffa116; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; background-color: rgba(255, 161, 22, 0.12); border: 1px solid rgba(255, 161, 22, 0.28); padding: 5px 14px; border-radius: 16px;">
                  Official Assessment Portal
                </span>
              </div>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <!-- Salutation -->
              <p style="color: #0f172a; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">
                Dear ${username},
              </p>
              
              <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                You have been registered to take the <strong>${assessmentTypeLabel}</strong> on the Meptrasoft Assessment Platform. Your one-time login credentials have been generated below to access your secure exam environment.
              </p>

              <!-- Credentials Card -->
              <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 22px; margin-bottom: 28px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding-bottom: 4px; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Registered Username</td>
                  </tr>
                  <tr>
                    <td style="color: #0f172a; font-size: 15px; font-weight: 600; padding-bottom: 14px; font-family: 'Inter', -apple-system, sans-serif;">${username}</td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 4px; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Registered Email</td>
                  </tr>
                  <tr>
                    <td style="color: #0f172a; font-size: 15px; font-weight: 600; padding-bottom: 18px; font-family: 'Inter', -apple-system, sans-serif;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 8px; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">One-Time Security Passcode (OTP)</td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 6px 0 14px 0;">
                      <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto;">
                        <tr>
                          <td align="center" style="background-color: #ffffff; border: 1px solid #94a3b8; border-radius: 6px; padding: 12px 28px; box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04);">
                            <span style="font-family: 'JetBrains Mono', 'Courier New', Courier, monospace; font-size: 32px; font-weight: 700; color: #0f172a; letter-spacing: 6px; display: block;">${otpCode}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="color: #64748b; font-size: 12px; line-height: 1.5; padding-top: 4px;">
                      This passcode is valid for <strong>24 hours</strong>. It can only be used once. Please keep your credentials confidential.
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 28px auto;">
                <tr>
                  <td align="center" style="background-color: #ffa116; border-radius: 6px;">
                    <a href="${frontendUrl}" target="_blank" style="background-color: #ffa116; color: #0f172a; font-size: 15px; font-weight: 700; text-decoration: none; padding: 13px 32px; border-radius: 6px; display: inline-block; letter-spacing: 0.3px; border: 1px solid #e88f0a;">
                      Access Assessment Portal
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Guidelines & Examination Requirements -->
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #ffa116; border-radius: 4px; padding: 16px 20px; margin-top: 24px;">
                <p style="color: #0f172a; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0;">
                  Assessment Guidelines & System Requirements
                </p>
                <ul style="margin: 0; padding-left: 18px; color: #475569; font-size: 13px; line-height: 1.6;">
                  <li style="margin-bottom: 6px;"><strong>Webcam Verification:</strong> An active, functioning webcam is mandatory. Face detection and activity logging are active throughout the test.</li>
                  <li style="margin-bottom: 6px;"><strong>Integrity Checks:</strong> Switching browser tabs, exiting fullscreen mode, or attempting copy-paste actions will be recorded as proctoring violations.</li>
                  <li style="margin-bottom: 6px;"><strong>Automated Evaluation:</strong> Code submissions are compiled and evaluated against private test suites in real time.</li>
                  <li><strong>Environment:</strong> Ensure a stable network connection and an uninterrupted environment before launching the assessment.</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #0f172a; font-size: 13px; font-weight: 600; margin: 0 0 4px 0;">
                Meptrasoft AI Technologies
              </p>
              <p style="color: #64748b; font-size: 12px; margin: 0 0 12px 0;">
                Official Technical Assessment & Evaluation System
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.5;">
                This is an automated system notification. If you did not request this invitation, please notify us at <a href="mailto:support@meptrasoft.com" style="color: #ffa116; text-decoration: underline;">support@meptrasoft.com</a>.<br />
                &copy; ${new Date().getFullYear()} Meptrasoft AI Technologies. All rights reserved.
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
