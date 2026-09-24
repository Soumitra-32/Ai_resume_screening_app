import dotenv from "dotenv";
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const isProd = process.env.NODE_ENV === "production";

export const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: isProd ? required("JWT_SECRET") : process.env.JWT_SECRET || "dev_secret_change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  // Leave unset to derive the cookie's `Secure` flag from the request itself
  // (see authController). Set COOKIE_SECURE=true to force it on, e.g. when
  // TLS is terminated by a proxy that doesn't forward X-Forwarded-Proto.
  cookieSecure:
    process.env.COOKIE_SECURE === undefined
      ? undefined
      : process.env.COOKIE_SECURE === "true",
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  mongoUri: isProd ? required("MONGO_URI") : process.env.MONGO_URI || "mongodb://admin:admin123@localhost:27017/resume_screener?authSource=admin",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  mlServiceUrl: process.env.ML_SERVICE_URL || "http://localhost:8000",
  resumeQueueConcurrency: Number(process.env.RESUME_QUEUE_CONCURRENCY) || 3,
};