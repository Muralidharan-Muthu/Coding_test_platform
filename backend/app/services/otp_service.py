import random
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
import os
import base64
from dotenv import load_dotenv

ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=ENV_PATH)

LOGO_PATH = os.path.join(os.path.dirname(__file__), '..', 'asset', 'dm-logo-email.png')
LOGO_CID = "dm_logo"  # Content-ID used in HTML as src="cid:dm_logo"

def _load_logo_b64() -> str:
    """Load logo as base64 for browser preview only."""
    try:
        with open(LOGO_PATH, 'rb') as f:
            return "data:image/png;base64," + base64.b64encode(f.read()).decode()
    except Exception:
        return ""

LOGO_DATA_URI = _load_logo_b64()

OTP_EXPIRY_HOURS = 24
OTP_LENGTH = 6
DEFAULT_TEST_TYPE = "both"

TEST_TYPE_SECTIONS = {
    "both": {"python", "sql"},
    "python": {"python"},
    "sql": {"sql"},
    "mcq": {"mcq"},
    "python_mcq": {"python", "mcq"},
    "sql_mcq": {"sql", "mcq"},
    "full": {"python", "sql", "mcq"},
}

TEST_TYPE_LABELS = {
    "both": "Python + SQL",
    "python": "Python Only",
    "sql": "SQL Only",
    "mcq": "MCQ Only",
    "python_mcq": "Python + MCQ",
    "sql_mcq": "SQL + MCQ",
    "full": "Python + SQL + MCQ",
}

TEST_TYPE_ALIASES = {
    "both": "both",
    "python": "python",
    "python_only": "python",
    "sql": "sql",
    "sql_only": "sql",
    "mcq": "mcq",
    "mcq_only": "mcq",
    "python_mcq": "python_mcq",
    "python+mcq": "python_mcq",
    "python + mcq": "python_mcq",
    "sql_mcq": "sql_mcq",
    "sql+mcq": "sql_mcq",
    "sql + mcq": "sql_mcq",
    "full": "full",
    "all": "full",
    "python_sql_mcq": "full",
    "python+sql+mcq": "full",
    "python + sql + mcq": "full",
    "python_sql": "both",
    "python+sql": "both",
    "python + sql": "both",
}


def normalize_test_type(test_type: str) -> str:
    normalized = str(test_type or DEFAULT_TEST_TYPE).strip().lower()
    return TEST_TYPE_ALIASES.get(normalized, DEFAULT_TEST_TYPE)


def get_test_type_sections(test_type: str):
    normalized = normalize_test_type(test_type)
    return TEST_TYPE_SECTIONS.get(normalized, TEST_TYPE_SECTIONS[DEFAULT_TEST_TYPE])


def has_test_type_section(test_type: str, section: str) -> bool:
    return str(section or "").strip().lower() in get_test_type_sections(test_type)


def get_test_type_label(test_type: str) -> str:
    normalized = normalize_test_type(test_type)
    return TEST_TYPE_LABELS.get(normalized, TEST_TYPE_LABELS[DEFAULT_TEST_TYPE])

from app.models.domain import CandidateOtp
from sqlalchemy.orm import Session

def generate_otp():
    return ''.join([str(random.randint(0, 9)) for _ in range(OTP_LENGTH)])

def save_candidate_otp(username: str, email: str, otp_code: str, db: Session):
    now = datetime.now()
    expires_at = now + timedelta(hours=OTP_EXPIRY_HOURS)
    
    existing = db.query(CandidateOtp).filter(CandidateOtp.email == email).first()
    test_type = normalize_test_type(existing.test_type if existing else DEFAULT_TEST_TYPE)
    
    if existing:
        db.delete(existing)
        db.commit()
    
    new_otp = CandidateOtp(
        username=username,
        email=email,
        otp_code=otp_code,
        expires_at=expires_at.isoformat(),
        created_at=now.isoformat(),
        sent=0,
        status='unused',
        test_type=test_type
    )
    db.add(new_otp)
    db.commit()

def get_candidate_otp(email: str, db: Session):
    result = db.query(CandidateOtp).filter(CandidateOtp.email == email).first()
    if not result:
        return None
    return {
        "username": result.username, "email": result.email, "otp_code": result.otp_code,
        "expires_at": result.expires_at, "created_at": result.created_at, "sent": result.sent,
        "test_type": normalize_test_type(result.test_type or DEFAULT_TEST_TYPE)
    }

def get_all_candidates(db: Session):
    now = datetime.now()
    results = db.query(CandidateOtp).order_by(CandidateOtp.created_at.desc()).all()
    
    candidates = []
    for row in results:
        if not row.otp_code or not row.expires_at:
            is_expired = False
        else:
            is_expired = now > datetime.fromisoformat(row.expires_at)
        candidates.append({
            "username": row.username, "email": row.email,
            "otp_code": row.otp_code if row.otp_code else "",
            "expires_at": row.expires_at if row.expires_at else "",
            "created_at": row.created_at, "sent": row.sent, "is_expired": is_expired,
            "test_type": normalize_test_type(row.test_type or DEFAULT_TEST_TYPE)
        })
    return candidates

def update_candidate_test_type(email: str, test_type: str, db: Session):
    normalized = normalize_test_type(test_type)
    candidate = db.query(CandidateOtp).filter(CandidateOtp.email == email).first()
    if candidate:
        candidate.test_type = normalized
        db.commit()
        return True
    return False

def mark_otp_sent(email: str, db: Session):
    candidate = db.query(CandidateOtp).filter(CandidateOtp.email == email).first()
    if candidate:
        candidate.sent = 1
        db.commit()

def verify_candidate_otp(username: str, email: str, otp_code: str, db: Session):
    now = datetime.now()
    result = db.query(CandidateOtp).filter(
        CandidateOtp.email == email, CandidateOtp.username == username
    ).first()
    
    if not result:
        return {"valid": False, "error": "Candidate not found. Please contact Admin for invitation."}
    
    stored_otp, expires_at_str, status = result.otp_code, result.expires_at, result.status
    
    if not stored_otp or not expires_at_str:
        return {"valid": False, "error": "OTP not generated. Please contact Admin to generate your OTP."}
    if now > datetime.fromisoformat(expires_at_str):
        return {"valid": False, "error": "OTP has expired. Please contact Admin for a new OTP."}
    if status == 'used':
        return {"valid": False, "error": "OTP has already been used. Please contact Admin for a new OTP."}
    if stored_otp != otp_code:
        return {"valid": False, "error": "Invalid OTP. Please check and try again."}
    return {"valid": True, "error": None}

def mark_otp_used(email: str, db: Session):
    candidate = db.query(CandidateOtp).filter(CandidateOtp.email == email).first()
    if candidate:
        candidate.status = 'used'
        db.commit()

def delete_candidate_otp(email: str, db: Session):
    candidate = db.query(CandidateOtp).filter(CandidateOtp.email == email).first()
    if candidate:
        db.delete(candidate)
        db.commit()


# ── EMAIL TEMPLATE ────────────────────────────────────────────────────────────
# Edit build_email_html() to change what the candidate receives.
# Preview at: http://localhost:8000/email-preview
# ─────────────────────────────────────────────────────────────────────────────

def build_email_html(username: str, otp_code: str, app_link: str, for_email: bool = False, test_type_label: str = "Python + SQL") -> str:
    # for_email=True: use cid: for real emails (works in Gmail/Outlook/all clients)
    # For email rendering, we use CID for the logo if for_email=True
    logo_src = f"cid:{LOGO_CID}" if for_email else f"{app_link.rstrip('/login')}/logo.png"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coding Assessment Invitation – Meptrasoft</title>
  <style>
    /* ── Responsive Email Styles ── */
    @media only screen and (max-width: 640px) {{
      .email-wrapper {{ padding: 0 !important; }}
      .email-card {{ width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }}
      .email-header-inner {{ padding: 14px 16px !important; }}
      .email-logo-img {{ width: 150px !important; max-width: 150px !important; }}
      .email-hero {{ padding: 22px 16px !important; }}
      .email-hero h1 {{ font-size: 20px !important; line-height: 1.3 !important; }}
      .email-hero p {{ font-size: 11px !important; }}
      .email-body {{ padding: 20px 16px 12px 16px !important; }}
      .email-greeting {{ font-size: 15px !important; }}
      .email-intro {{ font-size: 13px !important; }}
      .email-info-strip td {{ display: block !important; width: 100% !important; border-right: none !important; border-bottom: 1px solid #e2e8f0 !important; padding: 10px 14px !important; }}
      .email-cred-body {{ padding: 14px !important; }}
      .email-otp-code {{ font-size: 30px !important; letter-spacing: 5px !important; }}
      .email-cta a {{ padding: 13px 28px !important; font-size: 14px !important; display: block !important; text-align: center !important; }}
      .email-footer {{ padding: 18px 16px !important; }}
      .email-footer-logo {{ width: 120px !important; }}
      .email-disclaimer {{ padding: 12px 16px !important; }}
      .recruitment-badge {{ font-size: 10px !important; padding: 4px 10px !important; }}
    }}
    @media only screen and (min-width: 641px) {{
      .email-card {{ width: 620px !important; }}
    }}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Segoe UI',Arial,sans-serif;">

<table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f2f5;padding:40px 0;">
  <tr>
    <td align="center">
      <table class="email-card" width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.12);">

        <!-- ── HEADER / LOGO BAR ── -->
        <tr>
          <td style="background:#ffffff;padding:0;border-bottom:3px solid #EC6225;">
            <table class="email-header-inner" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:16px 24px;">
              <tr>
                <td style="vertical-align:middle;background:#ffffff;">
                  <img class="email-logo-img" src="{logo_src}" alt="Meptrasoft" width="190"
                    style="display:block;height:auto;max-height:58px;object-fit:contain;background:#ffffff;" />
                </td>
                <td style="text-align:right;vertical-align:middle;white-space:nowrap;padding-left:8px;">
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── HERO BANNER ── -->
        <tr>
          <td class="email-hero" style="background:linear-gradient(135deg,#EC6225 0%,#d4531a 100%);padding:32px 36px;text-align:center;">
            <p style="margin:0 0 6px 0;color:rgba(255,255,255,0.85);font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Coding Assessment Invitation</p>
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;line-height:1.3;">You're Invited to Take<br>Our Technical Assessment</h1>
          </td>
        </tr>

        <!-- ── MAIN BODY ── -->
        <tr>
          <td class="email-body" style="padding:36px 36px 20px 36px;">

            <p style="margin:0 0 6px 0;color:#1a202c;font-size:17px;font-weight:700;">Dear {username},</p>
            <p style="margin:0 0 20px 0;color:#4a5568;font-size:15px;line-height:1.8;">
              Greetings from <strong style="color:#0a1628;">Meptrasoft</strong>.<br>
              We are pleased to inform you that you have been shortlisted for our recruitment process.
              As the next step, you are invited to complete an <strong>online coding assessment</strong>.
            </p>

            <!-- INFO STRIP -->
            <table class="email-info-strip" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:24px;">
              <tr>
                <td style="padding:14px 20px;border-right:1px solid #e2e8f0;width:33%;">
                  <div style="color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Duration</div>
                  <div style="color:#1a202c;font-size:14px;font-weight:700;">2 Hours 30 Minutes</div>
                </td>
                <td style="padding:14px 20px;border-right:1px solid #e2e8f0;width:33%;">
                  <div style="color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Questions</div>
                  <div style="color:#1a202c;font-size:14px;font-weight:700;">{test_type_label}</div>
                </td>
                <td style="padding:14px 20px;width:33%;">
                  <div style="color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">OTP Valid For</div>
                  <div style="color:#1a202c;font-size:14px;font-weight:700;">24 Hours</div>
                </td>
              </tr>
            </table>

            <!-- CREDENTIALS CARD -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a1628;border-radius:10px;overflow:hidden;margin-bottom:24px;">
              <tr>
                <td style="background:linear-gradient(90deg,#EC6225,#d4531a);padding:12px 20px;">
                  <span style="color:#ffffff;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">&#128272; Your Login Credentials</span>
                </td>
              </tr>
              <tr>
                <td class="email-cred-body" style="padding:24px;">

                  <!-- USERNAME -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                    <tr>
                      <td style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:14px 18px;">
                        <div style="color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Username</div>
                        <div style="color:#ffffff;font-size:16px;font-weight:700;font-family:monospace;letter-spacing:0.5px;">{username}</div>
                      </td>
                    </tr>
                  </table>

                  <!-- OTP -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                    <tr>
                      <td style="background:rgba(236,98,37,0.15);border:2px solid rgba(236,98,37,0.5);border-radius:8px;padding:18px;text-align:center;">
                        <div style="color:#f58a4e;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">One-Time Password (OTP)</div>
                        <div class="email-otp-code" style="color:#ffffff;font-size:44px;font-weight:900;font-family:'Courier New',monospace;letter-spacing:10px;line-height:1;">{otp_code}</div>
                        <div style="color:#f87171;font-size:11px;font-weight:700;margin-top:10px;">&#9888; Valid for 24 hours &middot; Do not share</div>
                      </td>
                    </tr>
                  </table>

                  <!-- CTA BUTTON -->
                  <table class="email-cta" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center">
                        <a href="{app_link}" style="display:inline-block;background:linear-gradient(135deg,#EC6225,#d4531a);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 48px;border-radius:8px;letter-spacing:0.5px;">
                          Start Assessment &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:14px 0 0 0;color:#64748b;font-size:12px;text-align:center;">
                    Or copy this link: <a href="{app_link}" style="color:#f58a4e;text-decoration:none;">{app_link}</a>
                  </p>

                </td>
              </tr>
            </table>

            <!-- INSTRUCTIONS -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <div style="color:#92400e;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">&#9888;&#65039; Important Instructions</div>
                  <ul style="margin:0;padding-left:18px;color:#78350f;font-size:13px;line-height:2;">
                    <li>Use a stable internet connection during the test</li>
                    <li>Do not refresh or close the browser during submission</li>
                    <li>The OTP expires in <strong>24 hours</strong> &mdash; login promptly</li>
                    <li>This OTP is strictly confidential &mdash; do not share it</li>
                    <li>Ensure you complete the test in one sitting</li>
                  </ul>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 4px 0;color:#4a5568;font-size:14px;line-height:1.7;">
              We wish you the very best for your assessment. Should you have any questions,
              please reach out to our Admin team.
            </p>
            <p style="margin:0;color:#4a5568;font-size:14px;">
              If you did not expect this email, please disregard it safely.
            </p>

          </td>
        </tr>

        <!-- ── FOOTER ── -->
        <tr>
          <td class="email-footer" style="background:#0a1628;padding:28px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:18px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="background:#ffffff;border-radius:6px;padding:6px 12px;vertical-align:middle;">
                        <img class="email-footer-logo" src="{logo_src}" alt="Meptrasoft" width="140" style="display:block;height:auto;max-height:40px;object-fit:contain;" />
                      </td>
                      <td style="padding-left:12px;vertical-align:middle;">
                        <div style="color:#64748b;font-size:11px;">Talent Acquisition Team</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding-top:16px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td>
                        <p style="margin:0 0 4px 0;color:#64748b;font-size:12px;">Talent Acquisition Team</p>
                        <p style="margin:0;color:#64748b;font-size:12px;">
                          <a href="https://www.meptrasoft.com" style="color:#EC6225;text-decoration:none;font-weight:600;">www.meptrasoft.com</a>
                        </p>
                      </td>
                      <td style="text-align:right;">
                        <span style="display:inline-block;background:rgba(236,98,37,0.15);border:1px solid rgba(236,98,37,0.3);color:#f58a4e;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:4px;">Confidential</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── DISCLAIMER ── -->
        <tr>
          <td class="email-disclaimer" style="padding:16px 36px;background:#f8fafc;border-top:3px solid #EC6225;">
            <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;line-height:1.6;">
              This is an automated, confidential email sent by Meptrasoft Talent Acquisition System.<br>
              Please do not reply to this email. For queries contact your Admin representative.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>"""


def send_email_otp(email: str, otp_code: str, username: str = "Candidate", test_type: str = DEFAULT_TEST_TYPE):
    """Send OTP email to candidate using Gmail SMTP."""
    frontend_url = os.getenv("APP_URL", "http://localhost:3005")
    app_link = f"{frontend_url}/login"
    test_type_label = get_test_type_label(test_type)

    smtp_host     = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port     = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")

    if smtp_username:
        print(f"\nSMTP configured with username: {smtp_username}")
    else:
        print("\nWARNING: SMTP_USERNAME not set in .env file")

    if not smtp_username or not smtp_password:
        print(f"\n{'='*50}")
        print("⚠️  WARNING: SMTP credentials not configured!")
        print(f"{'='*50}\n")
        return {
            "success": False,
            "error": "SMTP credentials not configured. Please set SMTP_USERNAME and SMTP_PASSWORD in backend/.env."
        }

    # Use "related" as outer type so CID inline images work
    msg = MIMEMultipart("related")
    msg['From']    = f"Meptrasoft Recruitment <{smtp_username}>"
    msg['To']      = email
    msg['Subject'] = "Your Coding Assessment Invitation \u2013 Meptrasoft | Action Required"
    msg['Date']    = datetime.now().strftime("%a, %d %b %Y %H:%M:%S +0000")

    # Text + HTML alternatives inside a sub-part
    msg_alt = MIMEMultipart("alternative")

    text_content = f"""Hi {username},

You have been invited to take the coding assessment for the recruitment process at Meptrasoft.

Assessment Type: {test_type_label}
OTP Code: {otp_code}
Login Link: {app_link}

This OTP is valid for 24 hours and should not be shared with anyone.

Good luck with your test.

Regards,
Talent Acquisition Team
Meptrasoft
www.meptrasoft.com
"""

    html_content = build_email_html(
        username=username,
        otp_code=otp_code,
        app_link=app_link,
        for_email=True,
        test_type_label=test_type_label
    )

    msg_alt.attach(MIMEText(text_content, 'plain'))
    msg_alt.attach(MIMEText(html_content, 'html'))
    msg.attach(msg_alt)

    # Attach logo as inline CID image
    try:
        with open(LOGO_PATH, 'rb') as f:
            logo_img = MIMEImage(f.read(), _subtype='png')
            logo_img.add_header('Content-ID', f'<{LOGO_CID}>')
            logo_img.add_header('Content-Disposition', 'inline', filename='dm-logo.png')
            msg.attach(logo_img)
    except Exception as e:
        print(f"Warning: Could not attach logo: {e}")

    try:
        print(f"\nAttempting to send email to {email}...")
        print(f"SMTP Server: {smtp_host}:{smtp_port}")
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(msg)
            print(f"Email sent successfully to {email}")
        return {"success": True, "error": None}

    except smtplib.SMTPAuthenticationError as e:
        error_msg = f"SMTP Authentication failed. Error: {str(e)}"
        print(f"\nERROR: {error_msg}")
        return {"success": False, "error": error_msg}

    except smtplib.SMTPConnectError as e:
        error_msg = f"Failed to connect to SMTP server. Error: {str(e)}"
        print(f"\nERROR: {error_msg}")
        return {"success": False, "error": error_msg}

    except smtplib.SMTPException as e:
        error_msg = f"SMTP error: {str(e)}"
        print(f"\nERROR: {error_msg}")
        return {"success": False, "error": error_msg}

    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        print(f"\nERROR: {error_msg}")
        return {"success": False, "error": error_msg}
