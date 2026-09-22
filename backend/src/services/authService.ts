import bcrypt from 'bcryptjs';
import prisma from '../db/prisma';

export const getUserByEmail = async (email: string) => {
  const emailClean = email.trim().toLowerCase();
  return await prisma.authUser.findUnique({
    where: { email: emailClean }
  });
};

export const verifyPassword = async (plain: string, hashed: string) => {
  return await bcrypt.compare(plain, hashed);
};

export const authenticateUser = async (email: string, password: string) => {
  const user = await getUserByEmail(email);
  if (!user) return null;
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) return null;
  return user;
};

export const createUser = async (email: string, password: string, role: string, name: string) => {
  const emailClean = email.trim().toLowerCase();
  const existing = await getUserByEmail(emailClean);
  if (existing) {
    throw new Error(`User with email '${emailClean}' already exists.`);
  }

  const hashed = await bcrypt.hash(password, 10);
  const uid = `${role}_${emailClean.split('@')[0]}_${Math.random().toString(36).substring(2, 8)}`;
  
  const newUser = await prisma.authUser.create({
    data: {
      id: uid,
      email: emailClean,
      password_hash: hashed,
      role,
      name,
      created_at: new Date().toISOString()
    }
  });

  return {
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
    name: newUser.name
  };
};

export const updateUserPassword = async (email: string, newPassword: string) => {
  const emailClean = email.trim().toLowerCase();
  const user = await getUserByEmail(emailClean);
  if (user) {
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.authUser.update({
      where: { email: emailClean },
      data: { password_hash: hashed }
    });
  }
};

export const listUsers = async (role?: string) => {
  const users = await prisma.authUser.findMany({
    where: role ? { role } : undefined
  });
  return users.map(u => ({
    id: u.id,
    email: u.email,
    role: u.role,
    name: u.name,
    created_at: u.created_at || ''
  }));
};

export const deleteUser = async (email: string) => {
  const emailClean = email.trim().toLowerCase();
  const user = await getUserByEmail(emailClean);
  if (user) {
    await prisma.authUser.delete({
      where: { email: emailClean }
    });
  }
};
