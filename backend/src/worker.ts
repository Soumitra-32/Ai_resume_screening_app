import { connectDB } from "./config/db";

async function start() {
  await connectDB();
  await import("./queues/resumeWorker.js");
  console.log("✅ Resume scoring worker started. Waiting for jobs...");
}

start();