# SignalMDM Phase 1 — Backend Team Activity Log

**Project:** SignalMDM — Master Data Management Platform  
**Phase:** Phase 1 — Secure Ingestion Foundation  
**Development Period:** 08 May 2026 — 11 May 2026  

---

## Team

| Name | Role |
|------|------|
| **Jofrey John** | Backend Developer — Core Infrastructure, Models, Schemas, Services, Workers |
| **Rickson Richard** | Backend Developer — Application Entry Point, Database Layer, Routers, Middleware |

---

## Activity Log

| # | Date | Developer | Component | File / Task | Description | Status |
|---|------|-----------|-----------|-------------|-------------|--------|
| 1 | 08-05-2026 | Jofrey John | Core | `core/config.py` | Centralized settings using `pydantic-settings`. All environment variables typed and loaded from `.env`. | ✅ Done |
| 2 | 08-05-2026 | Jofrey John | Core | `core/redis_client.py` | Shared Redis connection pool (max 20 connections). Used by auth middleware and Celery workers. | ✅ Done |
| 3 | 08-05-2026 | Rickson Richard | App Entry | `main.py` | FastAPI application setup, lifespan hook (DB table creation + Redis warmup), global exception handler, CORS config. | ✅ Done |
| 4 | 08-05-2026 | Rickson Richard | Database | `signalmdm/database.py` | SQLAlchemy engine and `get_db()` session dependency. Connected to PostgreSQL. | ✅ Done |
| 5 | 08-05-2026 | Rickson Richard | Database | `signalmdm/enums.py` | All string-valued enums: `StatusEnum`, `IngestionStateEnum`, `SourceTypeEnum`, `ConnectionTypeEnum`, etc. | ✅ Done |
| 6 | 08-05-2026 | Jofrey John | Models | `signalmdm/models/tenant.py` | Root `Tenant` ORM model. All relationships to downstream tables declared. Multi-tenancy foundation. | ✅ Done |
| 7 | 08-05-2026 | Jofrey John | Models | `signalmdm/models/rbac.py` | `AppUser`, `Role`, `Permission`, `RolePermission`, `UserRole` tables. Full RBAC schema. | ✅ Done |
| 8 | 09-05-2026 | Jofrey John | Models | `signalmdm/models/source_system.py` | `SourceSystem` ORM model with `source_type`, `connection_type`, `config_json` (JSONB), soft-delete flag. | ✅ Done |
| 9 | 09-05-2026 | Jofrey John | Models | `signalmdm/models/ingestion_run.py` | `IngestionRun` state-machine model: `CREATED → RUNNING → RAW_LOADED → STAGING_CREATED → COMPLETED`. | ✅ Done |
| 10 | 09-05-2026 | Jofrey John | Models | `signalmdm/models/file_upload.py` | `FileUpload` metadata model — filename, stored path, size, content type, linked to run. | ✅ Done |
| 11 | 09-05-2026 | Jofrey John | Models | `signalmdm/models/raw_record.py` | Immutable `RawRecord` model — stores each data row as `JSONB` with MD5 checksum. | ✅ Done |
| 12 | 09-05-2026 | Jofrey John | Models | `signalmdm/models/staging_entity.py` | `StagingEntity` model — copy of raw data marked `READY_FOR_MAPPING` for Phase 2. | ✅ Done |
| 13 | 09-05-2026 | Jofrey John | Models | `signalmdm/models/audit.py` | Immutable `AuditLog` model — records every action with actor, table, old/new values. | ✅ Done |
| 14 | 09-05-2026 | Jofrey John | Models | `signalmdm/models/entity.py` | `Entity` ORM model for the master data record (Phase 2 target). | ✅ Done |
| 15 | 09-05-2026 | Jofrey John | Models | `signalmdm/models/attributes.py` | `EntityAttribute` and `EntityAttributeHistory` — attribute key/value store with change history. | ✅ Done |
| 16 | 09-05-2026 | Jofrey John | Models | `signalmdm/models/relationships.py` | `EntityRelationship` model — links between entities (parent/child, related). | ✅ Done |
| 17 | 09-05-2026 | Jofrey John | Models | `signalmdm/models/signals.py` | `SignalStreamBuffer` and `EntitySignal` — incoming behavioural/transactional signal store. | ✅ Done |
| 18 | 09-05-2026 | Jofrey John | Models | `signalmdm/models/scoring.py` | Risk score, drift, governance, and alert models for entity quality tracking. | ✅ Done |
| 19 | 09-05-2026 | Jofrey John | Models | `signalmdm/models/features.py` | `EntityFeatureStore` — ML feature vectors per entity per tenant. | ✅ Done |
| 20 | 09-05-2026 | Jofrey John | Models | `signalmdm/models/__init__.py` | Imports all models so SQLAlchemy registers all mappers before `create_all()` runs. | ✅ Done |
| 21 | 10-05-2026 | Jofrey John | Schemas | `signalmdm/schemas/ingestion_schema.py` | Pydantic v2 schemas: `TenantCreate`, `TenantRead`, `IngestionRunCreate`, `IngestionRunRead`, `IngestionStatusRead`. | ✅ Done |
| 22 | 10-05-2026 | Jofrey John | Schemas | `signalmdm/schemas/source_schema.py` | `SourceSystemCreate`, `SourceSystemRead` — request/response validation for source registration. | ✅ Done |
| 23 | 10-05-2026 | Jofrey John | Schemas | `signalmdm/schemas/common.py` | `StandardResponse` envelope and `ok()` helper — uniform JSON response format across all endpoints. | ✅ Done |
| 24 | 10-05-2026 | Rickson Richard | Middleware | `signalmdm/middleware/token_utils.py` | AES-256-CBC encrypt/decrypt, SHA-256 device fingerprint, JWT create/decode, Redis token revocation. | ✅ Done |
| 25 | 10-05-2026 | Rickson Richard | Middleware | `signalmdm/middleware/auth.py` | `require_auth` FastAPI dependency — full 5-step security check. `require_admin` and `require_role()` guards. | ✅ Done |
| 26 | 10-05-2026 | Jofrey John | Services | `signalmdm/services/audit_service.py` | `write_audit_log()` — inserts immutable `AuditLog` records on every state change or action. | ✅ Done |
| 27 | 10-05-2026 | Jofrey John | Services | `signalmdm/services/source_service.py` | Create, list, get, and soft-deactivate source systems. Includes audit log write on deactivation. | ✅ Done |
| 28 | 10-05-2026 | Jofrey John | Services | `signalmdm/services/ingestion_service.py` | Create and manage `IngestionRun` records, state-machine transitions, run retrieval. | ✅ Done |
| 29 | 10-05-2026 | Jofrey John | Services | `signalmdm/services/raw_service.py` | Save `FileUpload` metadata, bulk-insert `RawRecord` rows with MD5 checksums. | ✅ Done |
| 30 | 10-05-2026 | Jofrey John | Services | `signalmdm/services/staging_service.py` | Copy raw records to `staging_entities`, count staging rows per run. | ✅ Done |
| 31 | 10-05-2026 | Rickson Richard | Routers | `signalmdm/routers/tenant_router.py` | `POST /tenants/` (public), `GET /tenants/` (admin), `GET /tenants/{id}` (authenticated). | ✅ Done |
| 32 | 10-05-2026 | Rickson Richard | Routers | `signalmdm/routers/source_router.py` | `POST /sources/register`, `GET /sources/`, `GET /sources/{id}`, `DELETE /sources/{id}` (admin). | ✅ Done |
| 33 | 11-05-2026 | Rickson Richard | Routers | `signalmdm/routers/ingestion_router.py` | `POST /ingestion/start`, `POST /ingestion/{id}/upload`, `GET /ingestion/{id}/status`, `GET /ingestion/`. Async + sync fallback. | ✅ Done |
| 34 | 11-05-2026 | Jofrey John | Workers | `signalmdm/workers/raw_worker.py` | Celery task — reads file from disk, parses CSV/JSON, bulk-inserts `raw_records`, transitions run → `RAW_LOADED`. Retries ×3. | ✅ Done |
| 35 | 11-05-2026 | Jofrey John | Workers | `signalmdm/workers/staging_worker.py` | Celery task — reads `raw_records`, creates `staging_entities` (`READY_FOR_MAPPING`), transitions run → `COMPLETED`. Retries ×3. | ✅ Done |
| 36 | 11-05-2026 | Rickson Richard | Security | `main.py` — `SecurityHeadersMiddleware` | Added HTTP security headers to every response: `X-Frame-Options`, `HSTS`, `Permissions-Policy`, `X-Response-Time`, etc. | ✅ Done |
| 37 | 11-05-2026 | Rickson Richard | DevOps | `.env` + `storage/uploads/` | Environment configuration, directory structure for file uploads organized by `run_id`. | ✅ Done |
| 38 | 11-05-2026 | Rickson Richard | Utils | `utils/` | Checksum helper utilities (MD5 per row) used by the raw service during bulk insert. | ✅ Done |

---

## Contribution Summary

| Developer | Components | Files / Tasks | Share |
|-----------|-----------|---------------|-------|
| **Jofrey John** | Core, Models, Schemas, Services, Workers | 25 tasks | ~66% |
| **Rickson Richard** | App Entry, Database, Middleware, Routers, Security, DevOps | 13 tasks | ~34% |

---

## Component Ownership Map

```
MDM_Backend/
│
├── main.py                          → Rickson Richard
├── .env                             → Rickson Richard
│
├── core/
│   ├── config.py                    → Jofrey John
│   └── redis_client.py              → Jofrey John
│
├── signalmdm/
│   ├── database.py                  → Rickson Richard
│   ├── enums.py                     → Rickson Richard
│   │
│   ├── models/          (15 files)  → Jofrey John
│   ├── schemas/                     → Jofrey John
│   ├── services/                    → Jofrey John
│   ├── workers/                     → Jofrey John
│   │
│   ├── routers/                     → Rickson Richard
│   └── middleware/                  → Rickson Richard
│
├── utils/                           → Rickson Richard
└── storage/uploads/                 → Rickson Richard
```

---

*Last updated: 11-05-2026 | SignalMDM Phase 1 Backend Team*
