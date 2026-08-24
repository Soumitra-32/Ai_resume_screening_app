import bcrypt from "bcrypt";
import { connectDB } from "./config/db";
import { User } from "./models/User";
import { Job } from "./models/Job";
import mongoose from "mongoose";

async function seed() {
  await connectDB();

  await User.deleteMany({});
  await Job.deleteMany({});

  const passwordHash = await bcrypt.hash("password123", 10);

  const recruiter = await User.create({
    name: "Alice Recruiter",
    email: "alice@company.com",
    passwordHash,
    role: "recruiter",
  });

  await User.create({
    name: "Bob Candidate",
    email: "bob@candidate.com",
    passwordHash,
    role: "candidate",
  });

  await Job.create({
    recruiterId: recruiter._id,
    title: "Backend Engineer",
    description: "Node.js + MongoDB role",
    requiredSkills: ["Node.js", "MongoDB", "TypeScript"],
    experienceRequired: 2,
  });

  console.log("✅ Seed data inserted");
  await mongoose.disconnect();
}

seed();