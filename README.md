# Sift — AI Resume Screening

Recruiters post jobs; candidates upload a resume (PDF or DOCX). A Python ML
service parses the resume, extracts skills/experience, and scores it against the
job description. Applicants are then ranked by match score for the recruiter.

## Architecture

```
                 ┌────────────────────────┐
   Browser ─────▶│ frontend (React/Vite)  │
                 │  nginx: /api → backend │
                 └───────────┬────────────┘
                             │ HTTP (JSON, JWT in httpOnly cookie)
                 ┌───────────▼────────────┐
                 │ backend (Express/TS)   │────────────┐
                 │  REST API + Multer     │            │
                 └───┬────────────────┬───┘            │ BullMQ job
                     │ mongoose       │ axios          │ (resume-scoring)
        ┌────────────▼──────┐  ┌──────▼─────────────┐  │
        │ MongoDB           │  │ ML service (FastAPI)│  │
        │ users/jobs/       │  │  /api/parse-resume  │  │
        │ resumes/          │  │  /api/score-resume  │  │
        │ applications      │  └────────────────────┘  │
        └───────────────────┘                          │
                                       ┌───────────────▼────────────┐
                                       │ resume-worker (Node/BullMQ)│
                                       │  scores + updates MongoDB  │
                                       └───────────────┬────────────┘
                                                       │
                                                  ┌────▼────┐
                                                  │ Redis   │
                                                  └─────────┘
```

## Repository layout

| Path | What it is |
| --- | --- |
| `backend/` | Express + TypeScript REST API, Mongoose models, BullMQ queue/worker |
| `frontend/` | React 18 + Vite + Tailwind SPA (Zustand store, axios client) |
| `ML/` | FastAPI service: resume parsing, skill taxonomy, embedding similarity, weighted scoring |
| `ML/notebooks/` | Exploration/experiment notebooks (data prep, NER, scoring, evaluation) |
| `ML/data/` | Datasets used by the notebooks (not shipped in the Docker image) |
| `database/` | Pointer to the Mongoose schemas (the project uses MongoDB, not SQL) |
| `docker-compose.yml` | Mongo + Redis + ML + backend + worker + frontend |
| `.github/workflows/` | `ci.yml` (build/lint/test/images), `deploy.yml` (Render hooks) |

## Quick start (Docker)

```bash
cp .env.example .env      # then edit MONGO_PASSWORD / JWT_SECRET
docker compose up --build
```

* Frontend: <http://localhost:3000>
* Backend health: <http://localhost:5000/health>

Then seed demo accounts (`alice@company.com` / `bob@candidate.com`, password
`password123`):

```bash
docker compose exec backend npm run seed
```

## Local development (without Docker)

Requires MongoDB and Redis running locally (e.g. `docker run -p 27017:27017 mongo:7`
and `docker run -p 6379:6379 redis:7-alpine`).

```bash
# 1. ML service
cd ML
python -m venv .venv && . .venv/Scripts/activate     # or .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000

# 2. Backend API
cd backend
cp .env.example .env
npm install
npm run seed          # optional demo data
npm run dev           # http://localhost:5000

# 3. Scoring worker (separate terminal)
cd backend
npm run worker:dev

# 4. Frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev           # http://localhost:5173, proxies /api to :5000
```



## Environment variables

### Repository root `.env` (used by `docker compose`, and by the backend/worker containers)

| Variable | Purpose |
| --- | --- |
| `MONGO_USER` / `MONGO_PASSWORD` / `MONGO_DB` | MongoDB credentials; also interpolated into `MONGO_URI` by compose |
| `MONGO_URI` | Full connection string used by the backend/worker |
| `PORT` | Backend HTTP port (default `5000`) |
| `NODE_ENV` | `production` makes `JWT_SECRET` and `MONGO_URI` mandatory |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | JWT signing key and lifetime (default `7d`) |
| `ML_SERVICE_URL` | Base URL of the ML service (`http://ml-service:8000` in compose) |
| `COOKIE_SECURE` | Optional override for the auth cookie's `Secure` flag; by default it follows the request protocol |
| `VITE_API_BASE_URL` | API prefix baked into the frontend at build time (default `/api`) |

### `backend/.env` (local development outside Docker)

`MONGO_URI`, `REDIS_URL`, `ML_SERVICE_URL`, `RESUME_QUEUE_CONCURRENCY`,
`PORT`, `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `UPLOAD_DIR`,
`COOKIE_SECURE` — see `backend/.env.example`.

## API

All routes are under `/api`. Auth is a JWT delivered both as an httpOnly
`sift_token` cookie and in the login/register response body (the SPA stores it
and sends `Authorization: Bearer …`, which keeps auth working when the cookie
cannot be used).

| Method & path | Role | Purpose |
| --- | --- | --- |
| `POST /api/auth/register` | – | Sign up as `candidate` or `recruiter` |
| `POST /api/auth/login` | – | Sign in |
| `POST /api/auth/logout` | – | Clear the auth cookie |
| `GET /api/auth/me` | any | Current user |
| `GET /api/jobs` | any | Recruiters: own postings. Candidates: open postings |
| `GET /api/jobs/:id` | any | Job detail (ownership/status enforced) |
| `POST /api/jobs` | recruiter | Create a posting |

## Testing & linting

```bash
# ML service — contract/regression tests (pytest + fastapi TestClient)
cd ML
pip install -r requirements-dev.txt
python -m pytest -q

# Backend — typecheck/build only (no test suite yet)
cd backend && npm run build

# Frontend — ESLint + typecheck + production build
cd frontend && npm run lint && npm run build
```

`ML/tests/test_api.py` covers the parse endpoint (PDF + DOCX + rejections) and
the score endpoint, including a regression test that a skill written just before
a sentence period ("…and mongodb.") is still detected.

**Gaps:** there are no backend integration tests (they would need MongoDB +
Redis, so the CI job only typechecks/builds) and no frontend component tests
(Vitest is not installed). `ML/data/*.csv` are committed for the notebooks
(~100 MB total) — consider Git LFS if the repository grows further.

## CI/CD

* `ci.yml` runs on pushes/PRs to `main` and `development`, plus manual dispatch:
  backend typecheck+build, ML pytest, frontend lint+build, then Docker builds of
  all three images.
* `deploy.yml` posts to the Render deploy hooks. It skips (with a warning)
  instead of failing when a hook secret is not configured.

> Both workflows originally listened on `main`/`develop`; the repository has no
> `develop` branch, so CI never ran until the branch names were corrected.

## Notes & known limitations

* **Auth model.** The JWT is set as an httpOnly, `sameSite=lax` cookie *and*
  returned in the response body for the `Authorization` header. The cookie's
  `Secure` flag follows the actual request protocol, so the plain-HTTP Docker
  demo works; `COOKIE_SECURE=true` forces it on behind TLS terminators that
  don't forward `X-Forwarded-Proto`.
* **No OCR.** Scanned/image-only PDFs yield no text; `/api/parse-resume`
  returns a warning instead of failing.
* **First ML request is slow** unless the image was built with the model
  pre-cache (default) — the model is loaded lazily, guarded by a lock.
* **Uploads** are stored on the local `uploads-data` volume
  (`UPLOAD_DIR`); a multi-host deployment needs shared object storage.
* **No rate limiting** or request throttling on the API.
* **Skill extraction is rule/taxonomy-based** (`ML/app/services/skill_taxonomy.py`),
  not a trained NER model; the notebooks explore the trained approach.

| `PUT /api/jobs/:id` | recruiter | Update own posting |
| `DELETE /api/jobs/:id` | recruiter | Delete own posting (+ its applications) |
| `POST /api/jobs/:id/apply` | candidate | Apply with an existing resume (enqueues scoring) |
| `GET /api/jobs/:id/applications` | recruiter | All applications for own job |
| `POST /api/resumes/upload` | candidate | Upload PDF/DOCX (optional `jobId` applies atomically) |
| `GET /api/resumes/mine` | candidate | Own resumes |
| `GET /api/resumes/:id` | owner or authorised recruiter | Resume metadata |
| `GET /api/resumes/:id/file` | owner or authorised recruiter | Download the original file |
| `DELETE /api/resumes/:id` | candidate | Delete an unused resume |
| `GET /api/candidates/jobs/:jobId/candidates` | recruiter | Ranked candidates (filters, sorting, pagination) |
| `GET /api/candidates/jobs/:jobId/skills` | recruiter | Normalised required skills for the filter panel |
| `PATCH /api/candidates/applications/:id/status` | recruiter | Update an application's status |
| `GET /api/applications/mine` | candidate | Own applications |
| `POST /api/applications/:id/retry` | candidate | Re-queue scoring for a `failed` application |
| `GET /health` | – | Liveness probe |

ML service: `GET /health`, `POST /api/parse-resume` (multipart `file`),
`POST /api/score-resume` (JSON).

## How scoring works

`ML/app/services/scoring_engine.py` combines three signals into `match_score`:

| Signal | Weight (env-overridable) | Meaning |
| --- | --- | --- |
| `skill_overlap` | `WEIGHT_SKILL_OVERLAP` (0.4) | Fraction of the job's required skills present in the resume (recall against the requirement — extra resume skills are not penalised) |
| `semantic_similarity` | `WEIGHT_SEMANTIC_SIMILARITY` (0.4) | Cosine similarity between the resume's experience/skills sections and the job description, via `all-MiniLM-L6-v2` |
| `experience_match` | `WEIGHT_EXPERIENCE_MATCH` (0.2) | 1.0 when the resume meets the required years, linear partial credit below that |

Weights must sum to 1.0 (asserted at import). If the embedding model cannot be
loaded the service still starts and semantic similarity degrades to 0.0 —
`GET /health` reports `semantic_model_loaded`.
