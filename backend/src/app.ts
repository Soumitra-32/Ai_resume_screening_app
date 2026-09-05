import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes";
import jobRoutes from "./routes/jobRoutes";
import resumeRoutes from "./routes/resumeRoutes";
import candidateRoutes from "./routes/candidateRoutes";
import applicationRoutes from "./routes/applicationRoutes";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(cookieParser());

app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/applications", applicationRoutes);

app.use(errorHandler);

export default app;