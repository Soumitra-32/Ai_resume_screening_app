import { Pool } from "pg";
import { env } from "./env";

export const pool = new Pool({ connectionString: env.databaseUrl });

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('recruiter', 'candidate')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  experience_required NUMERIC(5, 2) CHECK (experience_required BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'closed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS jobs_recruiter_created_idx ON jobs(recruiter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_status_created_idx ON jobs(status, created_at DESC);
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  parsed_text TEXT,
  extracted_name TEXT,
  extracted_email TEXT,
  extracted_phone TEXT,
  extracted_skills TEXT[] NOT NULL DEFAULT '{}',
  extracted_experience NUMERIC(5, 2),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS resumes_candidate_uploaded_idx ON resumes(candidate_id, uploaded_at DESC);
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  match_score NUMERIC(5, 4) CHECK (match_score BETWEEN 0 AND 1),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scored', 'shortlisted', 'rejected', 'hired', 'failed')),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT applications_one_per_candidate_per_job UNIQUE (job_id, candidate_id)
);
CREATE INDEX IF NOT EXISTS applications_job_applied_idx ON applications(job_id, applied_at DESC);
CREATE INDEX IF NOT EXISTS applications_candidate_applied_idx ON applications(candidate_id, applied_at DESC);
`;

export async function connectDB() {
  try {
    await pool.query("SELECT 1");
    await pool.query(schema);
    console.log("✅ PostgreSQL connected; schema ready");
  } catch (error) {
    console.error("❌ PostgreSQL connection error:", error);
    process.exit(1);
  }
}

export async function closeDB() {
  await pool.end();
}
