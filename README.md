# SignalMDM

A multi-tenant Master Data Management platform with a secure ingestion pipeline, async processing, and audit-ready data lineage tracking.

---

## Project Layout

```
SignalMDM/
├── MDM_Backend/        ← FastAPI backend (Python)
├── MDM_DataLayer/      ← PostgreSQL schema dump (.sql)
│   └── SignalMDM.sql
├── MDM_Frontend/       ← React + TypeScript frontend (Vite)
└── README.md
```

---

## Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Python | 3.12+ | [python.org](https://python.org) |
| PostgreSQL | 15+ | [postgresql.org](https://postgresql.org) |
| Redis | 7+ | [redis.io](https://redis.io) / Windows: [Memurai](https://www.memurai.com/) |
| Node.js | 18+ | For the frontend only |
| Git | Any | |

---

## 1 — PostgreSQL Setup

### 1.1 Create the Database

Open **pgAdmin** or **psql** and run:

```sql
CREATE DATABASE "SignalMDM"
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE   = 'en_US.UTF-8'
    TEMPLATE   = template0;
```

### 1.2 Create the Application User (optional but recommended)

```sql
CREATE USER signalmdm_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE "SignalMDM" TO signalmdm_user;
GRANT ALL ON SCHEMA public TO signalmdm_user;
```

### 1.3 Restore the Schema

The schema SQL file is located at `MDM_DataLayer/SignalMDM.sql`.

**Option A — Using pg_restore (binary dump):**
```powershell
pg_restore -U postgres -d SignalMDM "d:\SignalMDM\MDM_DataLayer\SignalMDM.sql"
```

**Option B — Using psql (if it's a plain SQL dump):**
```powershell
psql -U postgres -d SignalMDM -f "d:\SignalMDM\MDM_DataLayer\SignalMDM.sql"
```

### 1.4 Database Tables

The schema creates the following tables:

**Core / Tenant Layer**
| Table | Purpose |
|-------|---------|
| `tenant` | Root organization record — all rows scope to this |
| `app_user` | Platform users (bcrypt hashed passwords) |
| `role` | Named roles scoped to a tenant |
| `permission` | Atomic actions (e.g. `entity:read`) |
| `role_permission` | Role ↔ Permission junction |
| `user_role` | User ↔ Role junction |
| `audit_log` | Immutable record of every data mutation |

**Entity Layer**
| Table | Purpose |
|-------|---------|
| `entity` | Core MDM entity record |
| `entity_attribute` | Key-value attributes per entity |
| `entity_attribute_history` | Full attribute change history |
| `entity_relationship` | Graph edges between entities |
| `entity_risk_score` | Versioned risk scoring snapshots |
| `entity_drift` | Detected drift events |
| `entity_governance` | Stewardship and data quality metrics |
| `entity_feature_store` | ML feature vectors per entity |
| `entity_domain_config` | Domain-level rules (scoring, governance) |
| `entity_alert` | Active alerts per entity |
| `entity_signal` | Signal events attached to entities |
| `signal_stream_buffer` | Incoming signal buffer before processing |

**Phase 1 — Ingestion Pipeline** *(created automatically by SQLAlchemy on startup)*
| Table | Purpose |
|-------|---------|
| `source_systems` | Registered data sources (CRM, ERP, etc.) |
| `ingestion_runs` | Upload sessions with state machine tracking |
| `file_uploads` | File metadata (name, path, size, checksum) |
| `raw_records` | Verbatim row data, immutable after insert |
| `staging_entities` | Processed records ready for mapping |

> **Note:** The 5 Phase 1 ingestion tables are **auto-created by SQLAlchemy** when the backend starts (`Base.metadata.create_all()`). You do not need to add them to the SQL dump manually.

---

## 2 — Redis Setup

Redis is used for two purposes:
1. **Celery broker/backend** — background task queue
2. **Token revocation blacklist** — JWT logout invalidation

### Windows (Memurai — Redis-compatible)

```powershell
# Download Memurai from https://www.memurai.com/
# After install, start the service:
net start Memurai

# Or use the Redis port for Windows (older, less maintained):
# https://github.com/tporadowski/redis/releases
```

### Verify Redis is running

```powershell
redis-cli ping
# Expected: PONG
```

### Redis Configuration Needed

No special Redis configuration is required. The backend connects to:
```
redis://localhost:6379/0
```
(database `0` is the default). Update `REDIS_URL` in `.env` if your Redis uses a different port or password.

**Redis does NOT require any schema or pre-created keys.** Keys are created automatically:
- Celery task results: `celery-task-meta-*`
- Revoked tokens: `revoked:<jwt_string>`

---

## 3 — Backend Setup (`MDM_Backend/`)

### 3.1 Create and Activate a Virtual Environment

```powershell
cd d:\SignalMDM\MDM_Backend

# Create venv
python -m venv venv

# Activate (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Activate (Windows CMD)
.\venv\Scripts\activate.bat
```

### 3.2 Install Python Dependencies

```powershell
pip install fastapi==0.136.1
pip install uvicorn==0.42.0
pip install sqlalchemy==2.0.40
pip install psycopg2-binary==2.9.11
pip install pydantic==2.11.7
pip install pydantic-settings==2.10.1
pip install python-dotenv==1.1.1
pip install celery==5.6.3
pip install redis==6.2.0
pip install python-multipart==0.0.22
pip install python-jose[cryptography]==3.5.0
pip install cryptography==46.0.5
pip install bcrypt==5.0.0
```

**Or install all at once:**

```powershell
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic pydantic-settings python-dotenv celery redis python-multipart "python-jose[cryptography]" cryptography bcrypt
```

### 3.3 Configure Environment Variables

Copy the template and fill in your values:

```powershell
# The .env file is already at MDM_Backend/.env
# Edit it with your actual values:
notepad .env
```

**Full `.env` reference:**

```env
# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/SignalMDM

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0

# ── JWT Authentication ────────────────────────────────────────────────────────
# Change JWT_SECRET to a long random string in production:
#   python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET=supersecretkey
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# ── AES-256 Token Encryption ──────────────────────────────────────────────────
# Must be exactly 64 hex characters (32 bytes). Generate with:
#   python -c "import secrets; print(secrets.token_hex(32))"
# This SAME key must be set in the frontend .env as VITE_TOKEN_ENCRYPTION_KEY
TOKEN_ENCRYPTION_KEY=a3f1b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2

# ── Application ───────────────────────────────────────────────────────────────
APP_ENV=development
UPLOAD_DIR=storage/uploads
```

> [!IMPORTANT]
> **Generate fresh secrets for production:**
> ```powershell
> python -c "import secrets; print('JWT_SECRET=' + secrets.token_hex(32))"
> python -c "import secrets; print('TOKEN_ENCRYPTION_KEY=' + secrets.token_hex(32))"
> ```

### 3.4 Create Upload Storage Directory

```powershell
New-Item -ItemType Directory -Force -Path "d:\SignalMDM\MDM_Backend\storage\uploads"
```

### 3.5 Verify Everything Loads

```powershell
python -c "import main; print('OK:', len(main.app.routes), 'routes registered')"
```

Expected output: `OK: 17 routes registered`

---

## 4 — Running the Backend

### Start the API Server

```powershell
cd d:\SignalMDM\MDM_Backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

| URL | Description |
|-----|-------------|
| http://localhost:8000 | Health check / root |
| http://localhost:8000/docs | Swagger UI (interactive API docs) |
| http://localhost:8000/redoc | ReDoc documentation |
| http://localhost:8000/health | Liveness probe (shows Redis status) |

### Start the Celery Worker (requires Redis)

Open a **second terminal** in the same directory (with venv activated):

```powershell
cd d:\SignalMDM\MDM_Backend
python -m celery -A signalmdm.workers.celery_app worker --loglevel=info --pool=solo
```

> `--pool=solo` is **required on Windows**. Linux/macOS can omit this flag.

> **Without Celery:** File uploads fall back to synchronous processing automatically — useful for development without Redis.

---

## 5 — API Authentication Flow

All API endpoints (except `POST /api/v1/tenants/` and health checks) require:

| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <AES-256-encrypted JWT>` | Yes |
| `X-Device-ID` | Stable browser/device UUID | Yes |
| `User-Agent` | Browser sets automatically | Auto |

**Security layers (in order):**
1. `SecurityHeadersMiddleware` — HSTS, X-Frame-Options, X-Content-Type-Options, etc.
2. AES-256-CBC decryption of the token
3. Redis blacklist check (revoked tokens)
4. JWT signature + expiry verification
5. Device fingerprint validation: `SHA256(deviceId|userAgent|userId)`

See `MDM_Backend/signalmdm/middleware/auth.py` for implementation details.

---

## 6 — Project Structure (Backend)

```
MDM_Backend/
├── .env                          ← Environment variables
├── main.py                       ← FastAPI app entrypoint
│
├── core/
│   ├── config.py                 ← Pydantic Settings (typed env vars)
│   └── redis_client.py           ← Centralized Redis connection pool
│
├── signalmdm/
│   ├── database.py               ← SQLAlchemy engine + get_db()
│   ├── enums.py                  ← All application enums
│   │
│   ├── models/                   ← SQLAlchemy ORM models (24 tables total)
│   ├── schemas/                  ← Pydantic v2 request/response schemas
│   ├── services/                 ← Business logic layer
│   ├── routers/                  ← FastAPI route handlers
│   ├── middleware/               ← Auth dependency + crypto utilities
│   └── workers/                  ← Celery task definitions
│
├── storage/
│   └── uploads/                  ← Uploaded files (organized by run_id)
│
└── utils/
    ├── checksum.py               ← MD5 deterministic hashing
    └── file_storage.py           ← File utility helpers
```

---

## 7 — Frontend Setup (`MDM_Frontend/`)

```powershell
cd d:\SignalMDM\MDM_Frontend
npm install
```

Create `MDM_Frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1

# Must match TOKEN_ENCRYPTION_KEY in MDM_Backend/.env exactly
VITE_TOKEN_ENCRYPTION_KEY=a3f1b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2
```

Install required security packages:

```powershell
npm install crypto-js axios
npm install --save-dev @types/crypto-js
```

Start the dev server:

```powershell
npm run dev
```

---

## 8 — Quick Start (All Services)

Open **3 separate terminals**:

```powershell
# Terminal 1 — PostgreSQL (already running as a service)

# Terminal 2 — Redis
net start Memurai   # or: redis-server

# Terminal 3 — FastAPI backend
cd d:\SignalMDM\MDM_Backend
python -m uvicorn main:app --reload --port 8000

# Terminal 4 — Celery worker (optional, needs Redis)
cd d:\SignalMDM\MDM_Backend
python -m celery -A signalmdm.workers.celery_app worker --loglevel=info --pool=solo

# Terminal 5 — Frontend
cd d:\SignalMDM\MDM_Frontend
npm run dev
```

---

## 9 — Troubleshooting

| Problem | Solution |
|---------|----------|
| `pydantic_core.ValidationError` on startup | Check all `.env` values are set; run `python -c "from core.config import settings; print(settings)"` |
| `psycopg2.OperationalError` | Verify PostgreSQL is running and `DATABASE_URL` credentials are correct |
| `Redis connection refused` | Start Redis/Memurai. Uploads work without it (sync fallback) |
| `TOKEN_ENCRYPTION_KEY` must be 64 hex chars | Run `python -c "import secrets; print(secrets.token_hex(32))"` |
| Celery not receiving tasks on Windows | Use `--pool=solo` flag |
| `UnicodeEncodeError` in terminal | Run `chcp 65001` to switch to UTF-8 code page |