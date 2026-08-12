import nodemailer from 'nodemailer';
import prisma from '../db/prisma';

export const OTP_EXPIRY_HOURS = 24;
export const OTP_LENGTH = 6;
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
    const normalized = (testType || DEFAULT_TEST_TYPE).trim().toLowerCase();
    return TEST_TYPE_ALIASES[normalized] || DEFAULT_TEST_TYPE;
};

export const getTestTypeSections = (testType?: string): string[] => {
    const normalized = normalizeTestType(testType);
    return TEST_TYPE_SECTIONS[normalized] || TEST_TYPE_SECTIONS[DEFAULT_TEST_TYPE];
};

export const hasTestTypeSection = (testType: string, section: string): boolean => {
    return getTestTypeSections(testType).includes((section || "").trim().toLowerCase());
};

export const generateOtp = (): string => {
    return Array.from({ length: OTP_LENGTH }, () => Math.floor(Math.random() * 10)).join('');
};

export const saveCandidateOtp = async (username: string, email: string, otpCode: string) => {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + OTP_EXPIRY_HOURS);

    const existing = await prisma.candidateOtp.findFirst({ where: { email } });
    if (existing) {
        return prisma.candidateOtp.update({
            where: { id: existing.id },
            data: {
                username,
                otp_code: otpCode,
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
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString(),
            sent: 1,
            status: 'unused',
            test_type: DEFAULT_TEST_TYPE
        }
    });
};

export const verifyCandidateOtp = async (email: string, otpCode: string) => {
    const candidate = await prisma.candidateOtp.findFirst({
        where: { email, otp_code: otpCode, status: 'unused' }
    });

    if (!candidate) return false;

    const expiresAt = candidate.expires_at ? new Date(candidate.expires_at) : new Date(0);
    if (expiresAt < new Date()) {
        return false;
    }

    await prisma.candidateOtp.update({
        where: { id: candidate.id },
        data: { status: 'used' }
    });

    return true;
};

export const getAllCandidates = async () => {
    return prisma.candidateOtp.findMany({
        orderBy: { id: 'asc' }
    });
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
    const candidate = await prisma.candidateOtp.findFirst({ where: { email } });
    if (candidate) {
        await prisma.candidateOtp.update({
            where: { id: candidate.id },
            data: { test_type: normalized }
        });
        return true;
    }
    return false;
};

export const sendOtpEmailToCandidate = async (username: string, email: string) => {
    const otpCode = generateOtp();
    const candidate = await saveCandidateOtp(username, email, otpCode);

    // If SMTP environment variables exist, attempt email delivery via nodemailer
    if (process.env.SMTP_HOST && process.env.SMTP_USERNAME && process.env.SMTP_PASSWORD) {
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: false,
                auth: {
                    user: process.env.SMTP_USERNAME,
                    pass: process.env.SMTP_PASSWORD
                }
            });

            await transporter.sendMail({
                from: process.env.SMTP_USERNAME,
                to: email,
                subject: 'Coding Assessment Access OTP',
                text: `Hello ${username},\n\nYour OTP for the coding assessment is: ${otpCode}\n\nThis OTP is valid for 24 hours.`
            });
            console.log(`[SMTP] Sent OTP email to ${email}`);
        } catch (smtpErr) {
            console.error(`[SMTP Warning] Failed to send email to ${email}:`, smtpErr);
        }
    }

    return { status: 'success', message: `OTP sent to ${email}`, otp_code: otpCode, candidate };
};
