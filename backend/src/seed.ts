import bcrypt from "bcrypt";
import { closeDB, connectDB, pool } from "./config/db";

async function seed() {
  await connectDB();
  const passwordHash = await bcrypt.hash("password123", 10);

  const recruiterResult = await pool.query<{ id: string }>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Alice Recruiter', 'alice@company.com', $1, 'recruiter')
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
     RETURNING id`,
    [passwordHash]
  );
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Bob Candidate', 'bob@candidate.com', $1, 'candidate')
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
    [passwordHash]
  );
  await pool.query(
    `INSERT INTO jobs (recruiter_id, title, description, required_skills, experience_required, status)
     SELECT $1, 'Backend Engineer', 'Node.js + PostgreSQL role', ARRAY['node.js', 'postgresql', 'typescript'], 2, 'open'
     WHERE NOT EXISTS (SELECT 1 FROM jobs WHERE recruiter_id = $1 AND title = 'Backend Engineer')`,
    [recruiterResult.rows[0].id]
  );

  console.log("✅ Demo users and job are ready (password: password123)");
}

seed().catch((error) => {
  console.error("Failed to seed PostgreSQL:", error);
  process.exitCode = 1;
}).finally(async () => {
  await closeDB();
});
