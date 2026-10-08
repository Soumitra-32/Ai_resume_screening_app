import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import multer from "multer";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);

  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", details: err.issues });
  }

  if (err?.code === "22P02") {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  if (err?.code === "23505") {
    return res.status(409).json({ error: "A record with these details already exists" });
  }

  if (err?.code === "23503" || err?.code === "23514" || err?.code === "22001") {
    return res.status(400).json({ error: "The submitted data is invalid" });
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }

  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal server error" });
}
