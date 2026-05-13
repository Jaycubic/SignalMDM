# SignalMDM Backend — Complete Presentation Walkthrough
> **For today's presentation — assumes zero prior knowledge of the system**

---

## Part 1: What Problem Are We Solving?

### What is MDM?
**MDM = Master Data Management.**

Every large company has data scattered across multiple systems:
- Sales data lives in **Salesforce (CRM)**
- Finance data lives in **SAP (ERP)**
- HR data lives in **Workday**
- Product data lives in a **CSV file** someone emails every Monday

The problem: the same customer might be called "Ali Ahmed" in one system, "A. Ahmed" in another, and have a different phone number in a third. **No one knows which version is correct.**

MDM is the platform that **collects all of this data, cleans it, deduplicates it, and produces one trusted "golden record"** for every entity (customer, product, supplier, etc.).

### What is SignalMDM?
SignalMDM is MDM platform. Phase 1 (what is running today) is the **Foundation Layer** — the secure pipeline that:
1. Accepts data uploads from registered sources
2. Stores every row **exactly as received** (never modified)
3. Prepares it for Phase 2 (cleaning, deduplication, golden record creation)

---

## Part 2: What is a Tenant?

This is the **most important concept** to understand first.

### Plain English Definition
A **tenant** is a company (or organization) that uses the SignalMDM platform.

Think of it like an apartment building:
- The building is SignalMDM
- Each apartment is a tenant (a separate company)
- Every apartment has its own furniture, its own data — **tenants never see each other's data**

### In the Code
```python
# signalmdm/models/tenant.py
class Tenant(Base):
    __tablename__ = "tenant"

    tenant_id   = UUID  # unique ID, e.g. "a3f2-..."
    tenant_name = String  # e.g. "Acme Corporation"
    tenant_code = String  # e.g. "acme_corp"  ← slug used in code
    status      = String  # ACTIVE / SUSPENDED / ARCHIVED
```

### Why it Matters for Security
Every single table in the database has a `tenant_id` column. When a user makes any API call, the system extracts their `tenant_id` from their **login token** (not from what they type — they cannot fake it). This ensures:

- Acme's users can only ever see Acme's data
- Globex's users can only ever see Globex's data
- Even an authenticated Acme user cannot query Globex records

---

## Part 3: What is Swagger UI?

Before we walk through the code, let's understand the tool you'll use to test it.

### What is Swagger UI?
Swagger UI is an **auto-generated, interactive documentation website** for our API. It is available at:
```
http://localhost:8000/docs
```

FastAPI generates it automatically from the code — no manual writing needed. It shows:
- Every available API endpoint (URL + HTTP method)
- What data each endpoint expects (the request body)
- What data it returns (the response shape)
- A **"Try it out"** button to call the real live API from the browser

### What is an API Endpoint?
An API endpoint is like a **function that you call over the internet**. Instead of calling `create_tenant()` in Python, a frontend sends an HTTP request to `/api/v1/tenants/` and gets a JSON response back.

### HTTP Methods (the verbs)
| Method | Meaning | Example |
|--------|---------|---------|
| `GET` | Read/fetch data | Get list of tenants |
| `POST` | Create new data | Create a tenant |
| `DELETE` | Remove/deactivate data | Remove a source system |

### What is JSON?
JSON is the format data is sent and received in. It looks like a Python dictionary:
```json
{
  "tenant_name": "Acme Corporation",
  "tenant_code": "acme_corp"
}
```

### The Three Endpoint Groups in Swagger
When you open `/docs`, you'll see three colored sections:

| Group | URL Prefix | What it does |
|-------|-----------|--------------|
| **Tenants** | `/api/v1/tenants/` | Create and look up companies (tenants) |
| **Source Systems** | `/api/v1/sources/` | Register where data comes from |
| **Ingestion** | `/api/v1/ingestion/` | Upload files and track processing |

---

## Part 4: The Project Structure

```
MDM_Backend/
│
├── main.py                    ← App entry point: wires everything together
│
├── core/
│   ├── config.py              ← All settings loaded from .env file
│   └── redis_client.py        ← Shared Redis connection pool
│
├── signalmdm/
│   ├── database.py            ← PostgreSQL connection
│   ├── enums.py               ← All allowed string values (ACTIVE, CREATED, etc.)
│   │
│   ├── models/                ← Database table definitions (15 tables)
│   │   ├── tenant.py          ← The root: every record links to a tenant
│   │   ├── source_system.py   ← Where data comes from (ERP, CRM, CSV...)
│   │   ├── ingestion_run.py   ← One upload session (tracks state)
│   │   ├── file_upload.py     ← File metadata (name, size, path)
│   │   ├── raw_record.py      ← Every row, stored untouched as JSON
│   │   ├── staging_entity.py  ← Data ready for Phase 2 processing
│   │   ├── audit.py           ← Immutable history of every action
│   │   ├── rbac.py            ← Users, roles, permissions
│   │   └── ...                ← Entity, signals, scoring (Phase 2+)
│   │
│   ├── schemas/               ← Request/response shapes (validation rules)
│   ├── routers/               ← API endpoints (URLs)
│   │   ├── tenant_router.py
│   │   ├── source_router.py
│   │   └── ingestion_router.py
│   │
│   ├── services/              ← Business logic (what actually happens)
│   │   ├── ingestion_service.py
│   │   ├── source_service.py
│   │   ├── raw_service.py
│   │   ├── staging_service.py
│   │   └── audit_service.py
│   │
│   ├── middleware/            ← Security layer
│   │   ├── auth.py            ← The 5-step authentication check
│   │   └── token_utils.py     ← AES encryption, JWT, device fingerprint
│   │
│   └── workers/               ← Background jobs (parse files asynchronously)
│       ├── raw_worker.py
│       └── staging_worker.py
│
└── storage/uploads/           ← Uploaded files saved here (organized by run_id)
```

### The Golden Rule: Layers Never Skip Each Other
```
HTTP Request
    ↓
[main.py]          ← SecurityHeadersMiddleware wraps EVERY response
    ↓
[routers/]         ← Calls require_auth → 5-step security check
    ↓
[services/]        ← Business logic, DB writes, audit log
    ↓
[models/]          ← SQLAlchemy ORM talks to PostgreSQL
    ↓
[workers/]         ← Celery + Redis handle heavy lifting in background
```

---

## Part 5: The Security System — How It Works

This is the most sophisticated part of Phase 1. **Every protected API call** passes through a 5-step security check before any business logic runs.

### Layer 1: HTTP Security Headers (applied to ALL responses)
Defined in `main.py` as `SecurityHeadersMiddleware`. Even before checking the user's token, every single HTTP response gets these headers attached:

| Header | What it prevents |
|--------|-----------------|
| `X-Content-Type-Options: nosniff` | Browser MIME-sniffing attacks |
| `X-Frame-Options: DENY` | Clickjacking (embedding in iframes) |
| `Strict-Transport-Security` | Forces HTTPS for 1 year |
| `Referrer-Policy` | Leaking URLs to third parties |
| `Permissions-Policy` | Disables geolocation, microphone, camera |
| `Server: SignalMDM` | Hides the actual server technology |

### Layer 2: The 5-Step Token Check (protected endpoints only)
Defined in `signalmdm/middleware/auth.py` as `require_auth`.

```
Incoming Request
      │
[Step 1] Extract Authorization header
         "Bearer <AES-256-CBC encrypted JWT>"
      │
[Step 2] AES-256-CBC Decrypt
         Encrypted token → Raw JWT string
         Uses TOKEN_ENCRYPTION_KEY from .env
         │ FAIL → 401 "Invalid token encryption"
      │
[Step 3] Redis Blacklist Check
         Does "revoked:<jwt>" key exist in Redis?
         │ YES → 401 "Token has been revoked"
      │
[Step 4] JWT Verify
         Check signature with JWT_SECRET
         Check it hasn't expired (24 hour lifetime)
         Extract: user_id, tenant_id, role, fpHash
         │ FAIL → 401 "Invalid or expired token"
      │
[Step 5] Device Fingerprint Validation
         Recompute SHA256( X-Device-ID | User-Agent | user_id )
         Must match "fpHash" claim inside the JWT
         │ FAIL → 401 "Invalid device fingerprint"
      │
      ▼
  TokenPayload injected into the route handler
  { user_id, tenant_id, role, fp_hash, raw_jwt }
```

### Why AES Encryption on the JWT?
A normal JWT is just **base64-encoded** — anyone can decode it and read the contents (user_id, tenant_id, role). By wrapping it in AES-256-CBC encryption before sending over the wire, the token is completely unreadable without the shared secret key.

### Why Device Fingerprinting?
If someone steals your JWT (e.g., from a browser's localStorage), they cannot use it from their own device. When you log in, the server computes:
```
fingerprint = SHA256( your_device_id | your_browser | your_user_id )
```
This fingerprint is **locked inside the JWT**. Every request, the server recomputes it from the actual headers — if it doesn't match (different device/browser), the request is rejected with 401.

### Role Guards
After authentication, endpoints can further restrict by role:

```python
# Anyone logged in
auth: TokenPayload = Depends(require_auth)

# Only admins
auth: TokenPayload = Depends(require_admin)

# Specific roles
auth: TokenPayload = Depends(require_role("admin", "manager"))
```

---

## Part 6: The Three API Groups — Endpoint by Endpoint

### Group 1: Tenants (`/api/v1/tenants/`)

#### `POST /api/v1/tenants/` — Create Tenant *(public, no auth)*
```
What it does: Registers a new company (tenant) in the system.
Who calls it: Platform administrator during initial setup.
Auth: NONE — intentionally public (bootstrap endpoint).
```
**Request body:**
```json
{
  "tenant_name": "Acme Corporation",
  "tenant_code": "acme_corp"
}
```
**What happens in the code:**
1. Checks if `tenant_code` is already taken → 409 Conflict if yes
2. Creates a `Tenant` record with `status = ACTIVE`
3. Returns the new tenant with its generated `tenant_id` UUID

---

#### `GET /api/v1/tenants/` — List All Tenants *(admin only)*
```
What it does: Returns every tenant in the platform.
Auth: Admin JWT required — non-admins get 403 Forbidden.
```
This is a **privileged endpoint** — only a platform administrator should see all tenants.

---

#### `GET /api/v1/tenants/{tenant_id}` — Get One Tenant *(any authenticated user)*
```
What it does: Returns one tenant by its UUID.
Auth: Any valid JWT.
```

---

### Group 2: Source Systems (`/api/v1/sources/`)

#### What is a Source System?
A **source system** is a registered data origin. Before you can upload data from Salesforce, you first register "Salesforce" as a source. Think of it as telling the MDM platform: *"I will be sending data from this system, here is its type and how it connects."*

Examples: `salesforce_crm` (type: CRM, connection: REST_API), `erp_export` (type: ERP, connection: CSV)

---

#### `POST /api/v1/sources/register` — Register a Source *(auth required)*
```
What it does: Registers a new data source for the authenticated tenant.
Auth: Any valid JWT. tenant_id comes FROM the JWT (cannot be forged).
```
**Request body:**
```json
{
  "source_name": "Salesforce CRM",
  "source_code": "salesforce_crm",
  "source_type": "CRM",
  "connection_type": "REST_API",
  "config_json": { "base_url": "https://mycompany.salesforce.com" }
}
```

**`source_type` options:** `CRM`, `ERP`, `DATABASE`, `FILE`, `API`, `STREAMING`, `OTHER`

**`connection_type` options:** `CSV`, `JSON`, `REST_API`, `JDBC`, `SFTP`, `S3`, `OTHER`

---

#### `GET /api/v1/sources/` — List Sources *(auth required)*
Returns all active sources **for the authenticated tenant only** — you cannot see another tenant's sources even if you try.

---

#### `GET /api/v1/sources/{source_id}` — Get One Source *(auth required)*

---

#### `DELETE /api/v1/sources/{source_id}` — Deactivate Source *(admin only)*
Performs a **soft delete** — sets `is_active = False`. The record is never destroyed, preserving the audit trail. Only admins can do this.

---

### Group 3: Ingestion (`/api/v1/ingestion/`)

This is the core of Phase 1 — the data intake pipeline. Uploading data is a **3-step process:**

```
Step 1: POST /ingestion/start          → get a run_id
Step 2: POST /ingestion/{run_id}/upload → send the file
Step 3: GET  /ingestion/{run_id}/status → check progress
```

---

#### What is an Ingestion Run?
An **Ingestion Run** represents one upload session. It has a **state machine** that tracks progress:

```
CREATED → RUNNING → RAW_LOADED → STAGING_CREATED → COMPLETED
                                                  ↘ FAILED (any step)
```

| State | Meaning |
|-------|---------|
| `CREATED` | Run session opened, waiting for a file |
| `RUNNING` | File received, background worker is processing |
| `RAW_LOADED` | All rows parsed and saved to `raw_records` table |
| `STAGING_CREATED` | Data copied to `staging_entities`, ready for Phase 2 |
| `COMPLETED` | Full pipeline done ✓ |
| `FAILED` | Something went wrong (error message stored) |

---

#### `POST /api/v1/ingestion/start` — Start a Run *(auth required)*
```
What it does: Opens a new ingestion run session for a source system.
Returns: A run_id UUID — you must use this in the next call.
```
**Request body:**
```json
{
  "source_system_id": "uuid-of-registered-source",
  "notes": "Monthly customer export from Salesforce"
}
```

---

#### `POST /api/v1/ingestion/{run_id}/upload` — Upload File *(auth required)*
```
What it does: Uploads a CSV or JSON file and triggers background processing.
File limit: 50 MB maximum.
```
**What happens step by step:**
1. Verifies the run exists and is in `CREATED` or `RUNNING` state
2. Reads the file bytes and checks size (max 50 MB)
3. **Saves file to disk** at `storage/uploads/{run_id}/{uuid}_{filename}`
4. Records file metadata in `file_uploads` table
5. Transitions run state → `RUNNING`
6. **Triggers async Celery worker** to process in background
7. Returns **immediately** with `"async_processing": true` — no waiting

> **Why return immediately?** A 10,000-row CSV might take 30 seconds to parse. We don't want the user waiting. The worker handles it in the background.

**Fallback:** If Redis/Celery is unavailable (e.g., in development), it automatically processes synchronously — the API still works.

---

#### `GET /api/v1/ingestion/{run_id}/status` — Check Status *(auth required)*
```
What it does: Poll the current state of a run.
Returns: state, file_count, record_count, staging_count, timestamps.
```
**Example response:**
```json
{
  "run_id": "abc-123...",
  "state": "COMPLETED",
  "file_count": 1,
  "record_count": 5420,
  "staging_count": 5420,
  "started_at": "2026-05-11T18:12:00Z",
  "completed_at": "2026-05-11T18:12:15Z"
}
```

---

#### `GET /api/v1/ingestion/` — List All Runs *(auth required)*
Returns recent ingestion runs for the tenant, newest first. Supports `skip` and `limit` for pagination.

---

## Part 7: The Background Workers

### Why Background Workers?
Parsing a large CSV with 50,000 rows and inserting them into a database takes time. If the API waited for this, the user would stare at a loading spinner. Instead:

1. File is saved to disk → **API returns instantly**
2. Worker picks up the job → **processes in background**
3. User polls `/status` → **sees progress update**

### raw_worker.py — Step 1
Triggered immediately after file upload:
- Reads the saved file from disk
- Parses each row (CSV or JSON)
- Bulk-inserts into `raw_records` (each row stored as JSON + MD5 checksum)
- Transitions run → `RAW_LOADED`
- Chains to staging worker automatically
- **Retries up to 3 times on failure**

### staging_worker.py — Step 2
Triggered automatically after raw_worker succeeds:
- Reads all `raw_records` for the run
- Creates matching `staging_entities` marked as `READY_FOR_MAPPING`
- Transitions run → `STAGING_CREATED` → `COMPLETED`
- **Retries up to 3 times on failure**

### The Technology Stack for Workers
- **Celery** — the task queue framework that manages background jobs
- **Redis** — the message broker (Celery sends tasks to Redis; workers read from Redis)

---

## Part 8: The Database Tables

15 tables total. Here are the Phase 1 core tables:

| Table | Purpose |
|-------|---------|
| `tenant` | Root of everything — one row per company |
| `app_user` | Users who log into the platform |
| `role` / `permission` / `role_permission` / `user_role` | RBAC (who can do what) |
| `source_systems` | Registered data origins (Salesforce, SAP, etc.) |
| `ingestion_runs` | One upload session — tracks state machine |
| `file_uploads` | Metadata for each uploaded file |
| `raw_records` | **Every data row, stored untouched as JSON + MD5 checksum** |
| `staging_entities` | Copy of raw data, ready for Phase 2 mapping |
| `audit_log` | Immutable record of every action ever taken |

### The Ingestion Lineage Chain
```
IngestionRun (1)
    └── FileUpload(s) (many)
            └── RawRecord(s) (many thousands)
                    └── StagingEntity(ies) (one per raw record)
```

### `raw_records` — The Sacred Table
This is the most important data store in Phase 1. Rules:
- **Never modified after insert** — immutable
- Each row stored as `raw_data: JSONB` — the exact original data
- Each row has an `md5_checksum` — proof the data was not tampered with
- Always linked back to `run_id`, `file_id`, `tenant_id`, `source_system_id`

---

## Part 9: Configuration — The `.env` File

All sensitive settings are in `.env` (never committed to git):

```ini
# Database
DATABASE_URL=postgresql://postgres:2025@localhost:5432/SignalMDM

# JWT Security
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440            # 24 hours

# AES Encryption (64 hex chars = 32 bytes)
TOKEN_ENCRYPTION_KEY=abc123...     # Generate: python -c "import secrets; print(secrets.token_hex(32))"

# Redis / Celery
REDIS_URL=redis://localhost:6379/0

# App
APP_ENV=development
UPLOAD_DIR=storage/uploads
```

The `core/config.py` file loads these into a typed `Settings` object using `pydantic-settings`. Any typo in the variable name causes an immediate error at startup — no silent misconfiguration.

---

## Part 10: What Happens When the Server Starts

Looking at the startup logs you shared:

```
[SignalMDM] Database tables verified / created.
[SignalMDM] Redis available: True
INFO: Application startup complete.
```

**Step by step:**
1. `load_dotenv()` — reads `.env` file
2. All SQLAlchemy models are imported (registers them with `Base`)
3. `Base.metadata.create_all(bind=engine)` — creates any missing tables in PostgreSQL
4. Redis connection pool is tested
5. FastAPI registers all three routers under `/api/v1`
6. SecurityHeadersMiddleware and CORS middleware are attached
7. Server listens on `0.0.0.0:8000`

The startup sequence from your log also shows SQLAlchemy checking whether each table exists before creating it — that's the long list of `SELECT pg_catalog.pg_class.relname` queries.

---

## Part 11: The Standard Response Format

Every API response in the system uses the same envelope:

```json
{
  "success": true,
  "message": "Tenant created successfully.",
  "data": { ... },
  "errors": null
}
```

On failure:
```json
{
  "success": false,
  "message": "An unexpected server error occurred.",
  "data": null,
  "errors": ["Tenant with code 'acme_corp' already exists."]
}
```

This consistency means the frontend always knows exactly where to find the data and whether the call succeeded — no guessing.

---

## Part 12: The Full Data Journey — Start to Finish

Here is everything that happens when a user uploads a file:

```
1. User logs in
   └── Receives AES-256-CBC encrypted JWT + device fingerprint embedded

2. POST /api/v1/ingestion/start
   ├── middleware: decrypt token → check Redis → verify JWT → check fingerprint
   ├── router: receives TokenPayload { user_id, tenant_id, role }
   ├── service: creates IngestionRun (state=CREATED) in DB
   └── returns: { run_id: "abc-123..." }

3. POST /api/v1/ingestion/abc-123/upload  (with CSV file)
   ├── middleware: same 5-step check
   ├── router: validates run state, reads file bytes, checks 50 MB limit
   ├── saves file to disk: storage/uploads/abc-123/uuid_filename.csv
   ├── raw_service: saves FileUpload record in DB
   ├── ingestion_service: transitions run → RUNNING
   ├── Celery: dispatches process_raw_upload.delay(...)
   └── returns: { "async_processing": true } ← IMMEDIATELY

4. Background: raw_worker runs
   ├── reads CSV from disk
   ├── parses every row
   ├── bulk-inserts into raw_records (each row = JSON + MD5)
   ├── transitions run → RAW_LOADED
   └── chains to staging_worker

5. Background: staging_worker runs
   ├── reads all raw_records for run
   ├── creates staging_entities (state=READY_FOR_MAPPING)
   ├── transitions run → STAGING_CREATED → COMPLETED
   └── audit_log updated at every state change

6. GET /api/v1/ingestion/abc-123/status
   └── returns: { state: "COMPLETED", record_count: 5420, staging_count: 5420 }
```

---

## Part 13: Summary — What Phase 1 Delivers

When an upload is `COMPLETED`, the system has produced:

| Output | Location | Description |
|--------|---------|-------------|
| Physical file | `storage/uploads/{run_id}/` | Original file preserved on disk |
| Raw records | `raw_records` table | Every row, untouched, with MD5 checksum |
| Staging entities | `staging_entities` table | Data queued for Phase 2 with `READY_FOR_MAPPING` |
| Run audit trail | `audit_log` table | Every state transition logged with who did it |
| Security | JWT claims | Every action tied to verified `user_id` + `tenant_id` |

**Phase 2 (next):** Takes the `staging_entities`, maps columns to a canonical schema, deduplicates records, merges them into golden entity records, and runs quality scoring.

---

## Quick Reference: All Endpoints

| Method | Endpoint | Auth | Role |
|--------|---------|------|------|
| `POST` | `/api/v1/tenants/` | ❌ None | — |
| `GET` | `/api/v1/tenants/` | ✅ JWT | Admin only |
| `GET` | `/api/v1/tenants/{id}` | ✅ JWT | Any |
| `POST` | `/api/v1/sources/register` | ✅ JWT | Any |
| `GET` | `/api/v1/sources/` | ✅ JWT | Any |
| `GET` | `/api/v1/sources/{id}` | ✅ JWT | Any |
| `DELETE` | `/api/v1/sources/{id}` | ✅ JWT | Admin only |
| `POST` | `/api/v1/ingestion/start` | ✅ JWT | Any |
| `POST` | `/api/v1/ingestion/{id}/upload` | ✅ JWT | Any |
| `GET` | `/api/v1/ingestion/{id}/status` | ✅ JWT | Any |
| `GET` | `/api/v1/ingestion/` | ✅ JWT | Any |
| `GET` | `/` | ❌ None | — |
| `GET` | `/health` | ❌ None | — |

---

*SignalMDM Phase 1 — Secure, Auditable Data Ingestion Foundation*
