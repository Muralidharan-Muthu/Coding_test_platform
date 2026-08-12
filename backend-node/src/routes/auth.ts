import { Router, Request, Response } from 'express';
import { authenticateUser, createUser, updateUserPassword, listUsers, deleteUser } from '../services/authService';

const router = Router();

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
    const email = req.params.email;
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
    const email = req.params.email;
    await deleteUser(email);
    return res.json({ status: "deleted" });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

export default router;
