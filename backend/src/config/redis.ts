import { Redis } from "ioredis";
import { env } from "./env";

export const redisConnection = new Redis(env.redisUrl, {
  maxRetriesPerRequest: null, // required by BullMQ
});

redisConnection.on("connect", () => console.log("✅ Redis connected"));
redisConnection.on("error", (err) => console.error("❌ Redis connection error:", err));