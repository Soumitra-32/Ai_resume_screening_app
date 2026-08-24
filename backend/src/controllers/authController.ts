import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/User";
import { env } from "../config/env";
import { asyncHandler } from "../utils/asyncHandler";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["recruiter", "candidate"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function signToken(user: { id: string; role: string; email: string }) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);

  const existing = await User.findOne({ email: data.email });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await User.create({
    name: data.name,
    email: data.email,
    passwordHash,
    role: data.role,
  });

  const token = signToken({ id: user._id.toString(), role: user.role, email: user.email });
  res.status(201).json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);

  const user = await User.findOne({ email: data.email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ id: user._id.toString(), role: user.role, email: user.email });
  res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
});