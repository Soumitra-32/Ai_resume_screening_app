import multer from "multer";
import path from "path";
import fs from "fs";
import { fromFile } from "file-type";
import { env } from "../config/env";

if (!fs.existsSync(env.uploadDir)) {
  fs.mkdirSync(env.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

function extFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const allowed = [".pdf", ".docx"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error("Only PDF or DOCX files are allowed"));
}

export const upload = multer({
  storage,
  fileFilter: extFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
]);

/**
 * Run AFTER multer.single(...) in the route chain. Inspects the actual
 * file bytes (magic numbers) rather than trusting the filename extension.
 */
export async function verifyFileContent(req: any, res: any, next: any) {
  if (!req.file) return next();

  try {
    const type = await fromFile(req.file.path);
    if (!type || !ALLOWED_MIME.has(type.mime)) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: "Uploaded file is not a valid PDF or DOCX" });
    }
    next();
  } catch (err) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    next(err);
  }
}