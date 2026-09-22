import nodemailer from 'nodemailer';
import prisma from '../db/prisma';
import { generateCandidateOtpEmailHtml } from '../utils/emailTemplates';

let sharedTransporter: nodemailer.Transporter | null = null;
let lastTransporterPass: string | null = null;

export function resetPooledTransporter() {
    sharedTransporter = null;
    lastTransporterPass = null;
}

export function getPooledTransporter(forceRefresh = false): nodemailer.Transporter | null {
    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT) || 587;
    const username = process.env.SMTP_USERNAME?.trim();
    const password = process.env.SMTP_PASSWORD ? process.env.SMTP_PASSWORD.replace(/\s+/g, '') : '';

    if (forceRefresh || password !== lastTransporterPass) {
        sharedTransporter = null;
    }

    if (!sharedTransporter && host && username && password) {
        const isSecure = port === 465;
        sharedTransporter = nodemailer.createTransport({
            host,
            port,
            secure: isSecure,
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
            auth: {
                user: username,
                pass: password
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        lastTransporterPass = password;
    }
    return sharedTransporter;
}

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
    let errorMessage: string | null = null;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3005';

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
                html: generateCandidateOtpEmailHtml({ username, email, otpCode, frontendUrl })
            });
            console.log(`[SMTP] Successfully sent OTP email to ${email}`);
            delivered = true;
        } catch (smtpErr: any) {
            errorMessage = smtpErr?.message || 'Failed to send email';
            console.error(`[SMTP Warning] Failed to send email to ${email}:`, errorMessage);
            if (smtpErr?.code === 'EAUTH' || errorMessage.includes('535') || errorMessage.includes('BadCredentials')) {
                resetPooledTransporter();
            }
        }
    } else {
        errorMessage = 'SMTP configuration is incomplete in .env';
        console.warn(`[SMTP Warning] Email not sent to ${email}: ${errorMessage}`);
    }

    return {
        status: delivered ? 'success' : 'warning',
        delivered,
        message: delivered
            ? `OTP sent via email to ${email}`
            : `Email delivery failed (${errorMessage}). Manual OTP: ${otpCode}`,
        error: errorMessage,
        otp: otpCode,
        otp_code: otpCode,
        login_link: `${frontendUrl}/login`,
        candidate
    };
};

export const verifySmtpConnection = async () => {
    const host = process.env.SMTP_HOST?.trim();
    const username = process.env.SMTP_USERNAME?.trim();
    const pass = process.env.SMTP_PASSWORD ? process.env.SMTP_PASSWORD.replace(/\s+/g, '') : '';

    if (!host || !username || !pass) {
        return {
            configured: false,
            success: false,
            message: 'SMTP credentials missing in .env (SMTP_HOST, SMTP_USERNAME, or SMTP_PASSWORD).'
        };
    }

    try {
        const transporter = getPooledTransporter(true);
        if (!transporter) {
            throw new Error('Transporter could not be initialized.');
        }
        await transporter.verify();
        return {
            configured: true,
            success: true,
            message: `SMTP connection verified successfully for ${username}.`
        };
    } catch (err: any) {
        return {
            configured: true,
            success: false,
            message: err.message || 'SMTP verification failed.',
            code: err.code || 'UNKNOWN',
            detail: err.response || err.message
        };
    }
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





