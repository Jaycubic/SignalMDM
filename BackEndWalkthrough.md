# SignalMDM Phase 1 Backend Walkthrough

## 1. Intro
SignalMDM is a Master Data Management platform that collects and organizes business data from multiple sources. Phase 1 focuses purely on the **Foundation Layer**: securely receiving files, storing the data exactly as it arrived, and preparing it for future processing, without modifying the original data.

---

## 2. What Exists
The system is built and operational with the following components:
- **APIs:** Endpoints to manage tenants, register data sources, and trigger data ingestion.
- **Models:** Database blueprints for tracking organizations, sources, and every piece of data uploaded.
- **Services:** The business logic connecting APIs to the database.
- **Security Middleware:** A two-layer security system — HTTP headers + encrypted JWT authentication on every protected endpoint.
- **Workers:** Background task processors (Celery) to handle heavy data parsing asynchronously.
- **File Storage:** A local directory (`storage/uploads/`) to save uploaded CSV/JSON files.
- **Async Processing:** A system that processes files in the background while immediately returning a response to the user.
- **Centralized Redis Client:** A single shared connection pool used by both the auth middleware and Celery workers.

---

## 3. Project Structure
The codebase is organized into specific folders:

- `core/`: Contains central application settings and infrastructure.
  - `config.py`: All environment variables as typed settings (database URL, JWT, AES key, Redis URL).
  - `redis_client.py`: **Centralized Redis connection pool** — one shared instance for the whole application.
- `signalmdm/`: The heart of the application, containing all business logic.
  - `models/`: Database table definitions (how data is structured).
  - `routers/`: API endpoints (URLs users interact with). All protected routes call the auth middleware.
  - `schemas/`: Rules for what data the APIs accept and return.
  - `services/`: The brains of the operation, executing logic for the routers.
  - `middleware/`: **Security layer** — token encryption/decryption, device fingerprinting, JWT validation.
  - `workers/`: Background jobs for processing files.
- `storage/uploads/`: The physical location where uploaded files are saved, organized by `run_id`.
- `utils/`: Helper tools, like generating unique checksums for data integrity.

---

## 4. Key Files

**Foundation**
- **DB Connection (`signalmdm/database.py`):** Connects the app to PostgreSQL. Provides the `get_db()` dependency injected into every router.
- **Redis Pool (`core/redis_client.py`):** Single shared Redis connection pool. Called by auth middleware for token revocation checks, and available to workers for caching.

**Models & Schemas**
- **Models (`signalmdm/models/*.py`):** Define tables like `source_systems`, `raw_records`, `audit_log`.
- **Schemas (`signalmdm/schemas/*.py`):** Pydantic v2 models that validate request bodies and shape API responses.

**Routers**
- **Routers (`signalmdm/routers/*.py`):** Handle web requests. Every protected endpoint declares `auth: TokenPayload = Depends(require_auth)` — this is how the middleware is applied.

**Services**
- **Services (`signalmdm/services/*.py`):** Perform actions like saving files, running state transitions, inserting raw records, and writing audit logs.

**Security Middleware**
- **`signalmdm/middleware/token_utils.py`:** All cryptographic building blocks — AES-256-CBC encrypt/decrypt, SHA-256 device fingerprint hashing, JWT creation/decoding, and Redis token blacklist operations.
- **`signalmdm/middleware/auth.py`:** The FastAPI dependency (`require_auth`) that runs the full 5-step security check on every protected request. Also provides `require_admin` and `require_role()` guards.

**Workers**
- **Workers (`signalmdm/workers/*.py`):** Independent Celery tasks that parse files and insert large amounts of data into the database.

---

## 5. Security Middleware — How It Works

This is the most important new addition. Every protected API call passes through a 5-step security check before any business logic runs.

### Step-by-Step Auth Flow

```
Incoming Request
      │
      ▼
[1] Extract Authorization header
      "Bearer <AES-256-CBC encrypted JWT>"
      │
      ▼
[2] AES-256-CBC Decrypt
      Encrypted token → Raw JWT string
      (Uses TOKEN_ENCRYPTION_KEY from .env)
      │  FAIL → 401 Invalid token encryption
      ▼
[3] Redis Blacklist Check
      Does key "revoked:<raw_jwt>" exist in Redis?
      │  YES → 401 Token has been revoked
      ▼
[4] JWT Verify
      Check signature using JWT_SECRET
      Check expiry (default: 24 hours)
      Extract: user_id, tenant_id, role, fpHash
      │  FAIL → 401 Invalid or expired token
      ▼
[5] Device Fingerprint Validation
      SHA256( X-Device-ID | User-Agent | user_id )
      Must match "fpHash" claim inside the JWT
      │  FAIL → 401 Invalid device fingerprint
      ▼
      TokenPayload injected into the route handler
      { user_id, tenant_id, role, fp_hash, raw_jwt }
```

### Why Device Fingerprinting?
When a user logs in, the server computes `SHA256(deviceId|userAgent|userId)` and embeds it in the JWT as `fpHash`. On every subsequent request, the server recomputes this hash from the request's headers and checks it matches what's in the JWT. This means **a stolen token cannot be used from a different device or browser** — the fingerprint will not match.

### Security Layers in `main.py`

There are two layers applied globally:

1. **`SecurityHeadersMiddleware`** (HTTP layer — all responses):
   - `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing attacks
   - `X-Frame-Options: DENY` — blocks clickjacking
   - `Strict-Transport-Security` — forces HTTPS for 1 year
   - `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer leakage
   - `Permissions-Policy` — disables geolocation, microphone, camera
   - `X-XSS-Protection` — legacy XSS protection for older browsers
   - `Server: SignalMDM` — hides the actual server technology

2. **`require_auth` dependency** (route layer — protected endpoints only):
   - The 5-step token validation described above.

### Role Guards
After `require_auth` succeeds, additional guards can restrict by role:

| Guard | Usage | Effect |
|-------|-------|--------|
| `Depends(require_auth)` | Any logged-in user | Validates token only |
| `Depends(require_admin)` | Admin users only | Rejects non-admin with 403 |
| `Depends(require_role("admin", "manager"))` | Multiple roles | Rejects unlisted roles |

### Which Endpoints Are Protected?

| Endpoint | Auth Required | Role |
|----------|--------------|------|
| `POST /api/v1/tenants/` | No (public bootstrap) | — |
| `GET /api/v1/tenants/` | Yes | admin only |
| `GET /api/v1/tenants/{id}` | Yes | any authenticated |
| `POST /api/v1/sources/register` | Yes | any authenticated |
| `GET /api/v1/sources/` | Yes | any authenticated |
| `GET /api/v1/sources/{id}` | Yes | any authenticated |
| `DELETE /api/v1/sources/{id}` | Yes | admin only |
| `POST /api/v1/ingestion/start` | Yes | any authenticated |
| `POST /api/v1/ingestion/{id}/upload` | Yes | any authenticated |
| `GET /api/v1/ingestion/{id}/status` | Yes | any authenticated |
| `GET /api/v1/ingestion/` | Yes | any authenticated |
| `GET /` and `GET /health` | No | — |

---

## 6. Centralized Redis Client

Previously, code across the application would each open its own Redis connection. Now there is one shared pool in `core/redis_client.py`.

**What uses Redis:**
- `auth middleware` — checks `revoked:<jwt>` key on every authenticated request
- `token_utils.revoke_token()` — writes to Redis on logout
- `Celery workers` — uses Redis as both the task broker and result backend

**Why one pool?**
- Caps total Redis connections at 20 for the whole process
- Avoids connection exhaustion under load
- Single place to change Redis URL or add authentication

---

## 7. Real Flow (Updated with Security)

Here is how data moves through the system now:

1. **Login** (future auth endpoint): Client receives an AES-encrypted JWT. Client stores it and sends it on every request.
2. **Register Source:** Request arrives → middleware decrypts token, verifies fingerprint, injects `tenant_id` from JWT → service registers the source.
3. **Start Ingestion:** Same middleware flow → service creates an `IngestionRun` in `CREATED` state.
4. **Upload File:** Same middleware flow → service saves file to disk → worker triggered asynchronously.

**Full request journey:**
```
HTTP Request
    → SecurityHeadersMiddleware (adds security headers)
    → require_auth (5-step token validation)
    → Router (receives validated TokenPayload)
    → Service (business logic + DB writes + audit log)
    → Worker (async: parse file → raw_records → staging_entities)
    → HTTP Response (with security headers already attached)
```

---

## 8. Database
The system uses the following key tables:
- **`tenant`**: Represents the customer/organization using the system. All other tables link back to this for security (multi-tenancy). The `tenant_id` is now extracted from the verified JWT — not from an open header.
- **`source_systems`**: Stores registered data origins (e.g., ERP, CRM).
- **`ingestion_runs`**: Tracks a specific upload session and its current state (`CREATED → RUNNING → RAW_LOADED → STAGING_CREATED → COMPLETED`).
- **`file_uploads`**: Stores metadata about uploaded files (name, size, disk location).
- **`raw_records`**: Stores the exact, unmodified data from the files, row by row as JSON. Immutable after insert.
- **`staging_entities`**: A copy of the raw data, prepared and waiting for Phase 2 processing.
- **`audit_log`**: An immutable history of every action taken in the system.

---

## 9. Async (Workers)
Background tasks handle the heavy lifting to keep the API fast and responsive:
- **`raw_worker.py`**: Triggered when a file is uploaded. Reads the file from disk, parses rows (CSV or JSON), bulk-inserts them into `raw_records`, then transitions the run to `RAW_LOADED`. Automatically chains to the staging worker on success. Retries up to 3 times on failure.
- **`staging_worker.py`**: Triggered automatically after `raw_worker` finishes. Reads all `raw_records` for the run and creates matching `staging_entities` marked as `READY_FOR_MAPPING`. Transitions run to `COMPLETED`. Retries up to 3 times on failure.

If Redis/Celery is unavailable, the upload endpoint **falls back to synchronous processing** so development works without Redis running.

---

## 10. Layer Connection (Updated)
The system's layers work in a strict chain of command:

```
[HTTP Layer]        SecurityHeadersMiddleware → adds security headers to every response
[Auth Layer]        require_auth dependency  → validates encrypted JWT + device fingerprint
[Router Layer]      Routers                  → receive validated TokenPayload (user_id, tenant_id, role)
[Business Layer]    Services                 → apply business rules, write to DB, write audit log
[Data Layer]        Models                   → SQLAlchemy ORM maps to PostgreSQL tables
[Async Layer]       Workers (Celery + Redis) → parse files, bulk insert raw + staging records
```

---

## 11. Final Result
When an upload is complete, the system has produced:
- A physically stored file on disk under `storage/uploads/{run_id}/`.
- Unmodified, verifiable data stored in `raw_records` (with MD5 checksum per row).
- Prepared data waiting in `staging_entities` (marked as `READY_FOR_MAPPING`).
- An updated ingestion run status of `COMPLETED`.
- A full audit trail in `audit_log` of every state transition and action.
- Security: every action is tied to a verified `user_id` and `tenant_id` from the JWT.

---

## 12. Simple Summary
SignalMDM Phase 1 is a **secure, auditable data-receiving pipeline**. Before any request touches business logic, it passes through two security layers: HTTP security headers are added to every response, and the encrypted JWT is decrypted, checked against a revocation list, verified cryptographically, and then validated against the device that originally logged in — preventing stolen tokens from working on other devices.

Once authenticated, the system registers data sources, starts upload sessions, and accepts CSV or JSON files. Files are saved to disk immediately (so the response is fast), then processed in the background by Celery workers that parse every row and store a perfect, untouched copy in the database. Everything is ready for Phase 2 mapping and normalization, with a complete audit trail of who did what and when.
