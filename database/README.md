# Database

This project uses **MongoDB** (via Mongoose), not the PostgreSQL schema originally
sketched in the project plan. There is no `schema.sql` — the source of truth for
the data model is the Mongoose schemas in `backend/src/models/`:

- `User.ts` — recruiters and candidates (`role: "recruiter" | "candidate"`)
- `Job.ts` — job postings, owned by a recruiter
- `Resume.ts` — uploaded resumes, owned by a candidate
- `Application.ts` — links a resume to a job, with `matchScore` and `status`

See those files directly for field-level detail; this folder is kept only as a
pointer so `database/` isn't a dead end in the project structure.