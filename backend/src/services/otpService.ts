let sharedTransporter: nodemailer.Transporter | null = null;
function getPooledTransporter() {
    if (!sharedTransporter && process.env.SMTP_HOST && process.env.SMTP_USERNAME && process.env.SMTP_PASSWORD) {
        sharedTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: false,
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
            auth: {
                user: process.env.SMTP_USERNAME,
                pass: process.env.SMTP_PASSWORD
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    }
    return sharedTransporter;
}
import nodemailer from 'nodemailer';
import prisma from '../db/prisma';

export const OTP_EXPIRY_HOURS = 24;
export const OTP_LENGTH = 6;
import { getQuestionsByType } from './questionTypeService';

export const DEFAULT_TEST_TYPE = "both";

const TEST_TYPE_SECTIONS: Record<string, string[]> = {
    "both": ["python", "sql"],
    "python": ["python"],
    "sql": ["sql"],
    "mcq": ["mcq"],
    "python_mcq": ["python", "mcq"],
    "sql_mcq": ["sql", "mcq"],
    "full": ["python", "sql", "mcq"],
};

const TEST_TYPE_ALIASES: Record<string, string> = {
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
};

export const normalizeTestType = (testType?: string): string => {
    if (!testType) return DEFAULT_TEST_TYPE;
    const raw = String(testType).trim().toLowerCase();
    if (TEST_TYPE_ALIASES[raw]) return TEST_TYPE_ALIASES[raw];
    const parts = raw.split(/[\+,\s\/&]+/).map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return DEFAULT_TEST_TYPE;
    return parts.join('+');
};

export const getTestTypeSections = (testType?: string): string[] => {
    const raw = String(testType || DEFAULT_TEST_TYPE).trim().toLowerCase();
    if (TEST_TYPE_SECTIONS[raw]) return TEST_TYPE_SECTIONS[raw];
    const parts = raw.split(/[\+,\s\/&]+/).map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return ['python', 'sql'];
    return Array.from(new Set(parts));
};

export const hasTestTypeSection = (testType: string, section: string): boolean => {
    return getTestTypeSections(testType).includes((section || "").trim().toLowerCase());
};

export const generateOtp = (): string => {
    return Array.from({ length: OTP_LENGTH }, () => Math.floor(Math.random() * 10)).join('');
};

export const saveCandidateOtp = async (username: string, email: string, otpCode: string) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_HOURS * 60 * 60 * 1000);

    const existing = await prisma.candidateOtp.findFirst({ where: { email } });
    if (existing) {
        return prisma.candidateOtp.update({
            where: { id: existing.id },
            data: {
                username,
                otp_code: otpCode,
                created_at: now.toISOString(),
                expires_at: expiresAt.toISOString(),
                sent: existing.sent + 1,
                status: 'unused'
            }
        });
    }

    return prisma.candidateOtp.create({
        data: {
            username,
            email,
            otp_code: otpCode,
            created_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            sent: 1,
            status: 'unused',
            test_type: DEFAULT_TEST_TYPE
        }
    });
};

export const verifyCandidateOtp = async (email: string, otpCode: string) => {
    const emailClean = (email || '').trim().toLowerCase();
    const candidate = await prisma.candidateOtp.findFirst({
        where: { email: emailClean, otp_code: otpCode.trim() }
    });

    if (!candidate) return { verified: false, reason: 'invalid_otp' };

    if (candidate.status === 'submitted') {
        return { verified: false, reason: 'already_submitted' };
    }

    const expiresAt = candidate.expires_at ? new Date(candidate.expires_at) : new Date(0);
    if (expiresAt < new Date()) {
        return { verified: false, reason: 'expired' };
    }

    if (candidate.status !== 'used') {
        await prisma.candidateOtp.update({
            where: { id: candidate.id },
            data: { status: 'used' }
        });
    }

    return { verified: true, candidate };
};

export const getAllCandidates = async () => {
    const candidates = await prisma.candidateOtp.findMany({
        orderBy: { id: 'asc' }
    });

    const shuffledRecords = await prisma.candidateSelectedExamProblem.findMany({
        select: { candidate_email: true }
    });

    const shuffledEmails = new Set(shuffledRecords.map(r => r.candidate_email.trim().toLowerCase()));

    return candidates.map(c => ({
        ...c,
        is_shuffled: shuffledEmails.has(c.email.trim().toLowerCase())
    }));
};

export const updateCandidateTestTypeBulk = async (assignments: Array<{ email: string; test_type: string }>) => {
    const updated = [];
    for (const a of assignments) {
        if (!a.email) continue;
        const normalized = normalizeTestType(a.test_type);
        const candidate = await prisma.candidateOtp.findFirst({ where: { email: a.email.trim().toLowerCase() } });
        if (candidate) {
            const res = await prisma.candidateOtp.update({
                where: { id: candidate.id },
                data: { test_type: normalized }
            });
            await shuffleCandidateQuestions(a.email, normalized);
            updated.push(res);
        }
    }
    return updated;
};

export const clearAllCandidates = async () => {
    await prisma.candidateOtp.deleteMany({});
    return { status: 'cleared', message: 'All candidates cleared successfully' };
};

export const deleteCandidateByEmail = async (email: string) => {
    const candidate = await prisma.candidateOtp.findFirst({ where: { email } });
    if (candidate) {
        await prisma.candidateOtp.delete({ where: { id: candidate.id } });
    }
    return { status: 'deleted', email };
};

export const updateCandidateDetails = async (currentEmail: string, username: string, newEmail: string) => {
    const candidate = await prisma.candidateOtp.findFirst({ where: { email: currentEmail } });
    if (!candidate) return null;

    return prisma.candidateOtp.update({
        where: { id: candidate.id },
        data: {
            username: username || candidate.username,
            email: newEmail || candidate.email
        }
    });
};

export const importCandidatesList = async (candidatesList: Array<{ username: string; email: string }>) => {
    const imported = [];
    for (const c of candidatesList) {
        if (!c.email || !c.username) continue;
        const emailClean = c.email.trim().toLowerCase();
        const usernameClean = c.username.trim();

        const existing = await prisma.candidateOtp.findFirst({ where: { email: emailClean } });
        if (existing) {
            const updated = await prisma.candidateOtp.update({
                where: { id: existing.id },
                data: { username: usernameClean }
            });
            imported.push(updated);
        } else {
            const created = await prisma.candidateOtp.create({
                data: {
                    username: usernameClean,
                    email: emailClean,
                    created_at: new Date().toISOString(),
                    sent: 0,
                    status: 'unused',
                    test_type: DEFAULT_TEST_TYPE
                }
            });
            imported.push(created);
        }
    }
    return imported;
};

export const getCandidateOtp = async (email: string) => {
    return prisma.candidateOtp.findFirst({ where: { email } });
};

export const updateCandidateTestType = async (email: string, testType: string) => {
    const normalized = normalizeTestType(testType);
    const emailClean = email.trim().toLowerCase();
    const candidate = await prisma.candidateOtp.findFirst({ where: { email: emailClean } });
    if (candidate) {
        await prisma.candidateOtp.update({
            where: { id: candidate.id },
            data: { test_type: normalized }
        });
        await shuffleCandidateQuestions(emailClean, normalized);
        return true;
    }
    return false;
};

export const sendOtpEmailToCandidate = async (username: string, email: string) => {
    const otpCode = generateOtp();
    const candidate = await saveCandidateOtp(username, email, otpCode);

    let delivered = false;

    // If SMTP environment variables exist, attempt fast email delivery via pooled nodemailer
    if (process.env.SMTP_HOST && process.env.SMTP_USERNAME && process.env.SMTP_PASSWORD) {
        try {
            const transporter = getPooledTransporter();
            if (!transporter) throw new Error('SMTP transporter not initialized');

            await transporter.sendMail({
                from: `"Meptrasoft AI Technologies" <${process.env.SMTP_USERNAME}>`,
                to: email,
                subject: '🔒 Your Meptrasoft Assessment Access Pass & Security OTP',
                attachments: [{ filename: 'meptrasoft-logo.png', path: require('path').join(process.cwd(), '../frontend/public/assets/meptrasoft-logo.png'), cid: 'meptrasoft_logo' }],
                html: `
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
                                  <a href="http://localhost:3005" target="_blank" style="background: linear-gradient(135deg, #0d9488 0%, #2563eb 100%); color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.35);">
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
                `
            });
            console.log(`[SMTP] Successfully sent OTP email to ${email}`);
            delivered = true;
        } catch (smtpErr: any) {
            console.error(`[SMTP Warning] Failed to send email to ${email}:`, smtpErr?.message || smtpErr);
        }
    }

    return {
        status: 'success',
        delivered,
        message: delivered ? `OTP sent via email to ${email}` : `OTP generated for ${email}`,
        otp_code: otpCode,
        candidate
    };
};

/**
 * Helper to pick a balanced distribution of questions across difficulty levels (Easy, Medium, Hard).
 * Falls back gracefully to any available problem if a specific difficulty pool doesn't have enough questions.
 */
function pickBalancedByDifficulty<T extends { id: any; difficulty?: string | null }>(
    problems: T[],
    targetCount: number,
    distribution: { Easy: number; Medium: number; Hard: number }
): T[] {
    const shuffleArray = <U>(arr: U[]): U[] => {
        const array = [...arr];
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = array[i]!;
            array[i] = array[j]!;
            array[j] = temp;
        }
        return array;
    };

    const pools: Record<'Easy' | 'Medium' | 'Hard', T[]> = {
        Easy: [],
        Medium: [],
        Hard: [],
    };

    for (const item of problems) {
        const diffNorm = (item.difficulty || '').trim().toLowerCase();
        if (diffNorm === 'easy') {
            pools.Easy.push(item);
        } else if (diffNorm === 'hard') {
            pools.Hard.push(item);
        } else {
            pools.Medium.push(item);
        }
    }

    pools.Easy = shuffleArray(pools.Easy);
    pools.Medium = shuffleArray(pools.Medium);
    pools.Hard = shuffleArray(pools.Hard);

    const selected: T[] = [];
    const selectedIds = new Set<any>();

    const pickFromPool = (poolName: 'Easy' | 'Medium' | 'Hard', count: number) => {
        let picked = 0;
        for (const item of pools[poolName]) {
            if (picked >= count) break;
            if (!selectedIds.has(item.id)) {
                selected.push(item);
                selectedIds.add(item.id);
                picked++;
            }
        }
    };

    // 1. Pick requested allocation from each difficulty tier
    pickFromPool('Easy', distribution.Easy);
    pickFromPool('Medium', distribution.Medium);
    pickFromPool('Hard', distribution.Hard);

    // 2. Fallback: if pool didn't have enough in specific tier, fill remainder from remaining problems
    if (selected.length < targetCount) {
        const remainingPool = shuffleArray(problems.filter(p => !selectedIds.has(p.id)));
        for (const item of remainingPool) {
            if (selected.length >= targetCount) break;
            selected.push(item);
            selectedIds.add(item.id);
        }
    }

    return selected.slice(0, targetCount);
}

export const shuffleCandidateQuestions = async (email: string, testType?: string) => {
    const normalized = normalizeTestType(testType);
    const emailClean = email.trim().toLowerCase();

    // 1. Update candidate test type
    const candidate = await prisma.candidateOtp.findFirst({ where: { email: emailClean } });
    if (candidate) {
        await prisma.candidateOtp.update({
            where: { id: candidate.id },
            data: { test_type: normalized }
        });
    }

    // 2. Clear previous candidate selected problems
    await prisma.candidateSelectedExamProblem.deleteMany({
        where: { candidate_email: emailClean }
    });

    const sections = getTestTypeSections(normalized);
    const now = new Date().toISOString();
    let totalSaved = 0;

    // Pick Python problems (1 Easy, 1 Medium, 1 Hard = 3 total)
    if (sections.includes('python')) {
        const pyProblems = await prisma.pythonProblem.findMany({ where: { is_active: 1 } });
        const selectedPy = pickBalancedByDifficulty(pyProblems, 3, { Easy: 1, Medium: 1, Hard: 1 });
        for (const prob of selectedPy) {
            await prisma.candidateSelectedExamProblem.create({
                data: {
                    candidate_email: emailClean,
                    problem_id: prob.id,
                    language: 'python',
                    difficulty: prob.difficulty || 'Medium',
                    marks: prob.marks || 10,
                    time_limit: prob.time_limit || 15,
                    title: prob.title,
                    saved_at: now
                }
            });
            totalSaved++;
        }
    }

    // Pick SQL problems (1 Easy, 1 Medium = 2 total)
    if (sections.includes('sql')) {
        const sqlProblems = await prisma.sqlProblem.findMany({ where: { is_active: 1 } });
        const selectedSql = pickBalancedByDifficulty(sqlProblems, 2, { Easy: 1, Medium: 1, Hard: 0 });
        for (const prob of selectedSql) {
            await prisma.candidateSelectedExamProblem.create({
                data: {
                    candidate_email: emailClean,
                    problem_id: prob.id,
                    language: 'sql',
                    difficulty: prob.difficulty || 'Medium',
                    marks: prob.marks || 10,
                    time_limit: prob.time_limit || 15,
                    title: prob.title,
                    saved_at: now
                }
            });
            totalSaved++;
        }
    }

    // Pick MCQ questions (2 Easy, 2 Medium, 1 Hard = 5 total)
    if (sections.includes('mcq')) {
        const mcqProblems = await prisma.mCQQuestion.findMany({});
        const selectedMcq = pickBalancedByDifficulty(mcqProblems, 5, { Easy: 2, Medium: 2, Hard: 1 });
        for (const prob of selectedMcq) {
            await prisma.candidateSelectedExamProblem.create({
                data: {
                    candidate_email: emailClean,
                    problem_id: prob.id,
                    language: 'mcq',
                    difficulty: prob.difficulty || 'easy',
                    marks: prob.marks || 10,
                    time_limit: prob.time || 10,
                    title: prob.title || prob.question_text || 'MCQ Question',
                    saved_at: now
                }
            });
            totalSaved++;
        }
    }

    // Dynamic question types support (e.g. java, cpp, etc.)
    const standardSections = new Set(['python', 'sql', 'mcq']);
    for (const section of sections) {
        if (!standardSections.has(section)) {
            try {
                const dynamicProblems = await getQuestionsByType(section);
                if (dynamicProblems && dynamicProblems.length > 0) {
                    const count = Math.min(3, dynamicProblems.length);
                    const selectedDyn = pickBalancedByDifficulty(dynamicProblems, count, { Easy: 1, Medium: 1, Hard: 1 });
                    for (const prob of selectedDyn) {
                        await prisma.candidateSelectedExamProblem.create({
                            data: {
                                candidate_email: emailClean,
                                problem_id: prob.id,
                                language: section,
                                difficulty: prob.difficulty || 'Medium',
                                marks: prob.marks || 10,
                                time_limit: prob.time_limit || 15,
                                title: prob.title || `${section.toUpperCase()} Question`,
                                saved_at: now
                            }
                        });
                        totalSaved++;
                    }
                }
            } catch (err) {
                console.error(`[Shuffle] Dynamic section error for ${section}:`, err);
            }
        }
    }

    return {
        status: 'success',
        email: emailClean,
        test_type: normalized,
        saved: totalSaved,
        message: `Shuffled and assigned ${totalSaved} difficulty-balanced questions for ${emailClean}`
    };
};





