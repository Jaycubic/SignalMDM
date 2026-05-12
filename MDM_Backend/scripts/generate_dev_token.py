"""
scripts/generate_dev_token.py
------------------------------
DEV UTILITY — Generate a valid SignalMDM encrypted JWT for local development.

Usage (run from MDM_Backend/ with venv active):
    python scripts/generate_dev_token.py

What it does:
  1. Reads JWT_SECRET and TOKEN_ENCRYPTION_KEY from .env
  2. Creates a test tenant via POST /api/v1/tenants/ (public endpoint)
  3. Asks for your browser's User-Agent (copy from DevTools → Network tab)
  4. Generates a signed JWT with the correct device fingerprint
  5. AES-256-CBC encrypts it
  6. Prints browser console commands to store token in localStorage

DO NOT use this script in production.
"""

import base64
import hashlib
import json
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ── Load .env manually (avoid importing signalmdm package directly) ─────────
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

JWT_SECRET           = os.environ.get("JWT_SECRET", "supersecretkey")
JWT_ALGORITHM        = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES   = int(os.environ.get("JWT_EXPIRE_MINUTES", "1440"))
TOKEN_ENCRYPTION_KEY = os.environ.get("TOKEN_ENCRYPTION_KEY", "")
API_BASE             = os.environ.get("API_BASE", "http://localhost:8000/api/v1")

# ── Validate AES key ─────────────────────────────────────────────────────────
if len(TOKEN_ENCRYPTION_KEY) != 64:
    print("\n[ERROR] TOKEN_ENCRYPTION_KEY in .env must be exactly 64 hex characters.")
    print("        Generate one with:  python -c \"import secrets; print(secrets.token_hex(32))\"")
    sys.exit(1)

# ── Imports that require venv packages ───────────────────────────────────────
try:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.backends import default_backend
    from jose import jwt
    import urllib.request
    import urllib.parse
except ImportError as e:
    print(f"\n[ERROR] Missing dependency: {e}")
    print("        Make sure you are running inside the venv.")
    sys.exit(1)


# ── Crypto helpers (mirrors token_utils.py) ──────────────────────────────────

def compute_fingerprint(device_id: str, user_agent: str, user_id: str) -> str:
    raw = f"{device_id}|{user_agent}|{user_id}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def create_jwt(user_id: str, tenant_id: str, role: str,
               device_id: str, user_agent: str) -> str:
    fp_hash = compute_fingerprint(device_id, user_agent, user_id)
    expire  = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub":       user_id,
        "tenant_id": tenant_id,
        "role":      role,
        "fpHash":    fp_hash,
        "exp":       expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def aes_encrypt(plaintext: str) -> str:
    key = bytes.fromhex(TOKEN_ENCRYPTION_KEY)
    iv  = os.urandom(16)
    data = plaintext.encode("utf-8")
    pad_len = 16 - (len(data) % 16)
    data += bytes([pad_len] * pad_len)
    enc = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend()).encryptor()
    ciphertext = enc.update(data) + enc.finalize()
    return base64.b64encode(iv + ciphertext).decode("utf-8")


# ── Step 1 — Create (or reuse) a test tenant ─────────────────────────────────

def create_tenant(tenant_name: str, tenant_code: str) -> dict | None:
    url  = f"{API_BASE}/tenants/"
    body = json.dumps({"tenant_name": tenant_name, "tenant_code": tenant_code}).encode()
    req  = urllib.request.Request(url, data=body,
                                  headers={"Content-Type": "application/json"},
                                  method="POST")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = json.loads(e.read())
        if e.code == 409:
            return {"conflict": True, "detail": body.get("detail", "")}
        print(f"[ERROR] Tenant creation failed: {e.code} — {body}")
        return None
    except Exception as e:
        print(f"[ERROR] Could not reach backend at {API_BASE}: {e}")
        print("        Make sure uvicorn is running:  python -m uvicorn main:app --reload --port 8000")
        return None


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("\n" + "=" * 60)
    print("  SignalMDM — Dev Token Generator")
    print("=" * 60)

    # --- 1. Tenant ---
    print("\n[Step 1] Creating test tenant 'SignalMDM Dev' (code: signalmdm_dev) …")
    result = create_tenant("SignalMDM Dev", "signalmdm_dev")
    if result is None:
        sys.exit(1)

    if result.get("conflict"):
        print("         Tenant already exists — OK, will use existing tenant_id.")
        print("         → Open http://localhost:8000/docs and call")
        print("           GET /api/v1/tenants/{tenant_id} to look up your tenant_id,")
        print("           OR paste the tenant_id you already know below.")
        tenant_id = input("\n  Paste your tenant_id (UUID): ").strip()
    else:
        data = result.get("data", {})
        tenant_id = data.get("tenant_id", "")
        print(f"         tenant_id = {tenant_id}")

    if not tenant_id:
        print("[ERROR] No tenant_id provided. Exiting.")
        sys.exit(1)

    # --- 2. User ID ---
    user_id = str(uuid.uuid4())
    print(f"\n[Step 2] Generated dev user_id: {user_id}")
    print("         (This is a synthetic dev user — not stored in app_user table.)")

    # --- 3. Device ID ---
    device_id = "signalmdm-dev-web"
    print(f"\n[Step 3] Device ID: {device_id}")
    print("         This will be stored as localStorage['device_id'] in your browser.")

    # --- 4. User-Agent ---
    print("\n[Step 4] Browser User-Agent is needed for the device fingerprint.")
    print("         How to get it:")
    print("           • Open your browser → F12 → Console tab")
    print("           • Type:  navigator.userAgent   and press Enter")
    print("           • Copy the full string and paste it below.")
    print()
    user_agent = input("  Paste your browser User-Agent: ").strip()
    if not user_agent:
        user_agent = ""
        print("         (empty user-agent — fingerprint computed with empty string)")

    # --- 5. Role ---
    print("\n[Step 5] Select role:")
    print("         1) admin   — full access including DELETE /sources/{id}")
    print("         2) viewer  — read-only (default)")
    role_choice = input("  Enter 1 or 2 [default: 1]: ").strip()
    role = "admin" if role_choice != "2" else "viewer"
    print(f"         role = {role}")

    # --- 6. Generate token ---
    print("\n[Step 6] Generating encrypted JWT …")
    raw_jwt       = create_jwt(user_id, tenant_id, role, device_id, user_agent)
    encrypted_jwt = aes_encrypt(raw_jwt)

    # --- 7. Output ---
    print("\n" + "=" * 60)
    print("  SUCCESS — Paste these commands in your browser console (F12)")
    print("=" * 60)
    print()
    print(f'localStorage.setItem("auth_token", "{encrypted_jwt}");')
    print(f'localStorage.setItem("device_id",  "{device_id}");')
    print(f'localStorage.setItem("tenant_id",  "{tenant_id}");')
    print(f'localStorage.setItem("user_id",    "{user_id}");')
    print()
    print("  Then refresh the page — you should see sources loading from the API.")
    print()
    print(f"  Token expires in: {JWT_EXPIRE_MINUTES // 60} hours")
    print("  To generate a new token, re-run this script.")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
