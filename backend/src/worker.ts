import { connectDB } from "./config/db";

async function start() {
  await connectDB();
  require("./queues/resumeWorker");
  console.log("✅ Resume scoring worker started. Waiting for jobs...");
}

start();
