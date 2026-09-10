import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';

export const authRouter = Router();

authRouter.post('/signup', async (req, res) => {
  const { username, kdfSalt, authProof } = req.body ?? {};

  if (
    typeof username !== 'string' || !username ||
    typeof kdfSalt !== 'string' || !kdfSalt ||
    typeof authProof !== 'string' || !authProof
  ) {
    return res.status(400).json({ error: 'username, kdfSalt, and authProof are required' });
  }

  const authHash = await bcrypt.hash(authProof, 12);

  try {
    const user = await prisma.user.create({
      data: { username, kdfSalt, authHash },
      select: { id: true, username: true },
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'username already taken' });
    }
    throw err;
  }
});
