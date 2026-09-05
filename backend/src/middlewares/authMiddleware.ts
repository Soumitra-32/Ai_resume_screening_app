import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UserRole } from "../models/User";

interface JwtPayload {
  id: string;
  role: UserRole;
  email: string;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const cookieToken = (req as any).cookies?.sift_token;
  const header = req.headers.authorization;
  const headerToken = header?.startsWith("Bearer ") ? header.split(" ")[1] : undefined;

  const token = cookieToken || headerToken;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    next();
  };
}