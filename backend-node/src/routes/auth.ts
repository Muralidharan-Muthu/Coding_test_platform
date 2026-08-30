import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { authenticateUser, createUser, updateUserPassword, listUsers, deleteUser } from '../services/authService';
import { getCandidateOtp, verifyCandidateOtp } from '../services/otpService';
import prisma from '../db/prisma';

const router = Router();

// POST /auth/login
// Candidate OTP login (username + email + OTP from the invitation email).
// Frontend Login.jsx posts here via api.js's `login()` helper.
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { name = '', email = '', otp = '', test_location = 'home' } = req.body;
    const usernameClean = String(name).trim();
    const emailClean = String(email).trim().toLowerCase();
    const otpClean = String(otp).trim();

    if (!usernameClean || !emailClean || !otpClean) {
      return res.status(400).json({ detail: 'Username, email and OTP are required.' });
    }

    const candidate = await getCandidateOtp(emailClean);
    if (!candidate || candidate.username.trim().toLowerCase() !== usernameClean.toLowerCase()) {
      return res.status(404).json({ detail: 'Candidate not found. Check your username and email.' });
    }

    const verifyResult = await verifyCandidateOtp(emailClean, otpClean);
    if (!verifyResult.verified) {
      if (verifyResult.reason === 'already_submitted') {
        return res.status(403).json({
          detail: 'You have already completed and submitted this assessment. Please contact the administrator for a new test invitation if you need to retake it.',
        });
      }
      return res.status(401).json({ detail: 'Invalid or expired OTP. Please check your email or request a new one.' });
    }

    // Ensure a User record exists so downstream features (submissions,
    // assessment results) have something to attach to.
    const now = new Date().toISOString();
    let user = await prisma.user.findUnique({ where: { email: emailClean } });
    if (!user) {
      user = await prisma.user.create({
        data: { name: candidate.username, email: emailClean, test_location, created_at: now },
      });
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 6); // 6-hour exam session
    await prisma.serverSession.create({
      data: {
        id: sessionId,
        candidate_email: emailClean,
        user_id: String(user.id),
        test_type: candidate.test_type,
        expires_at: expiresAt,
        is_active: true,
      },
    });

    return res.json({
      status: 'success',
      session_id: sessionId,
      user_id: user.id,
      name: candidate.username,
      email: emailClean,
      test_location,
    });
  } catch (err: any) {
    console.error('[Auth] Candidate OTP login failed:', err);
    return res.status(500).json({ detail: err.message });
  }
});

router.post('/candidate-login', async (req: Request, res: Response) => {
  try {
    const { email = '', password = '' } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ detail: "Email and password are required." });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ detail: "Invalid email or password." });
    }
    if (user.role !== "candidate") {
      return res.status(403).json({ detail: "Not a candidate account." });
    }

    return res.json({
      status: "success",
      role: user.role,
      email: user.email,
      name: user.name,
      user_id: user.id
    });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

router.post('/admin-login', async (req: Request, res: Response) => {
  try {
    const { email = '', password = '' } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ detail: "Email and password are required." });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ detail: "Invalid email or password." });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ detail: "Not an admin account." });
    }

    return res.json({
      status: "success",
      role: user.role,
      email: user.email,
      name: user.name,
      user_id: user.id
    });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

router.get('/users', async (req: Request, res: Response) => {
  try {
    const role = req.query.role as string | undefined;
    const users = await listUsers(role);
    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

router.post('/users', async (req: Request, res: Response) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = (req.body.password || "").trim();
    const role = (req.body.role || "candidate").trim().toLowerCase();
    const name = (req.body.name || email.split("@")[0]).trim();

    if (!email || !password) {
      return res.status(400).json({ detail: "Email and password are required." });
    }
    if (role !== "admin" && role !== "candidate") {
      return res.status(400).json({ detail: "Role must be 'admin' or 'candidate'." });
    }

    const user = await createUser(email, password, role, name);
    return res.json({ status: "created", user });
  } catch (err: any) {
    return res.status(409).json({ detail: err.message });
  }
});

router.put('/users/:email/password', async (req: Request, res: Response) => {
  try {
    const email = String(req.params.email || '');
    const password = (req.body.password || "").trim();
    if (!password) {
      return res.status(400).json({ detail: "New password is required." });
    }
    await updateUserPassword(email, password);
    return res.json({ status: "success", message: "Password updated." });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

router.delete('/users/:email', async (req: Request, res: Response) => {
  try {
    const email = String(req.params.email || '');
    await deleteUser(email);
    return res.json({ status: "deleted" });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

export default router;
