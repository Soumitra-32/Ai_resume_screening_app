# Database

The backend uses PostgreSQL through the `pg` driver. On startup it creates the
`users`, `jobs`, `resumes`, and `applications` tables and their indexes if they
do not already exist. Set `DATABASE_URL` in `backend/.env` to connect to your
local PostgreSQL server. The models in `backend/src/models/` define the
TypeScript row shapes; SQL constraints and schema setup are in
`backend/src/config/db.ts`.

The migration replaces the former MongoDB/Mongoose implementation. Existing
MongoDB data is not migrated automatically; export and transform it separately
if you need to preserve it.
