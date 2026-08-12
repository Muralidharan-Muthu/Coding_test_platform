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
    return prisma.candidateOtp.findMany();
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
