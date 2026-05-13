-- ============================================================
-- SignalMDM — Platform Admin Table
-- Run this script against your SignalMDM PostgreSQL database.
--
-- Usage:
--   psql -U postgres -d SignalMDM -f platform_admin_setup.sql
-- ============================================================

-- Drop if re-running
DROP TABLE IF EXISTS platform_admin;

-- ─── Table ───────────────────────────────────────────────────
CREATE TABLE platform_admin (
    admin_id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

    email               VARCHAR(255)    NOT NULL UNIQUE,
    username            VARCHAR(150)    NOT NULL,

    -- bcrypt hash — NEVER store plaintext
    password_hash       TEXT            NOT NULL,

    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,

    -- TOTP 2-Factor Authentication
    two_fa_enabled          BOOLEAN     NOT NULL DEFAULT FALSE,
    two_fa_secret           TEXT,           -- base32 TOTP secret (nullable until setup)
    two_fa_setup_complete   BOOLEAN     NOT NULL DEFAULT FALSE,

    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE platform_admin IS
    'Platform-level super-admin accounts. Not scoped to any tenant. '
    'Separate from AppUser (which is tenant-scoped).';

COMMENT ON COLUMN platform_admin.password_hash IS
    'bcrypt hash (cost 12). NEVER store plaintext.';

COMMENT ON COLUMN platform_admin.two_fa_secret IS
    'Base32-encoded TOTP secret. NULL until 2FA setup is completed.';

-- Indexes
CREATE INDEX idx_platform_admin_email    ON platform_admin (email);
CREATE INDEX idx_platform_admin_active   ON platform_admin (is_active);

-- ─── Seed: Test SuperAdmin ────────────────────────────────────
-- Credentials:  admin@signalmdm.com  /  Admin@Signal123
-- Hash generated with: python -c "import bcrypt; print(bcrypt.hashpw(b'Admin@Signal123', bcrypt.gensalt(12)).decode())"
-- Replace the hash below if you want a different password.
INSERT INTO platform_admin (
    admin_id,
    email,
    username,
    password_hash,
    is_active,
    two_fa_enabled,
    two_fa_setup_complete
) VALUES (
    gen_random_uuid(),
    'admin@signalmdm.com',
    'SuperAdmin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGTmLwCEZxgcJsf3DeMrVUFlDIG',
    TRUE,
    FALSE,
    FALSE
);

-- Verify
SELECT admin_id, email, username, is_active, two_fa_enabled, created_at
FROM platform_admin;
