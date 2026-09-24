import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/User";
import { env } from "../config/env";
import { asyncHandler } from "../utils/asyncHandler";

const registerSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  // Both roles can self-register — the signup form offers candidate *and*
  // recruiter. Restricting this to "candidate" made recruiter signup
  // impossible from the UI (400 Validation failed).
  role: z.enum(["candidate", "recruiter"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function signToken(user: { id: string; role: string; email: string }) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

const COOKIE_NAME = "sift_token";
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // keep in sync with JWT_EXPIRES_IN

/**
 * Cookie attributes for the auth cookie.
 *
 * `secure` is derived from whether THIS request actually arrived over HTTPS
 * (directly or through a proxy that sets X-Forwarded-Proto), not from
 * NODE_ENV. The Docker compose stack serves the SPA over plain
 * http://localhost:3000 while NODE_ENV=production, and browsers silently
 * discard `Secure` cookies received over an insecure connection — which made
 * every login bounce straight back to the login page. COOKIE_SECURE can
 * override the detection when needed.
 */
function authCookieOptions(req: Request) {
  const isHttps = req.secure || req.header("x-forwarded-proto") === "https";
  return {
    httpOnly: true,
    secure: env.cookieSecure ?? isHttps,
    sameSite: "lax" as const,
    path: "/",
  };
}

function setAuthCookie(req: Request, res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    ...authCookieOptions(req),
    maxAge: COOKIE_MAX_AGE_MS,
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
  setAuthCookie(req, res, token);
  res.status(201).json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    // Returned in the body as well as the cookie: the SPA stores it for the
    // Authorization header, which keeps auth working in cross-origin dev
    // setups and anywhere the browser won't accept the cookie.
    token,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);

  const user = await User.findOne({ email: data.email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ id: user._id.toString(), role: user.role, email: user.email });
  setAuthCookie(req, res, token);
  res.json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    token,
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  // Clear with the same attributes the cookie was set with, otherwise some
  // browsers keep the stale cookie around.
  res.clearCookie(COOKIE_NAME, authCookieOptions(req));
  res.json({ message: "Logged out" });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
});