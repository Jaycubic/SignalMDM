/**
 * serverClient.js
 * ---------------
 * Express-based production server for SignalMDM Frontend.
 *
 * This server:
 *  1. Serves the static 'dist' folder (Vite build output).
 *  2. Implements a strict Content Security Policy (CSP) via Helmet.
 *  3. Proxies requests to the SignalMDM Backend if needed (optional).
 *  4. Handles SPA routing (redirects all non-file requests to index.html).
 *
 * Usage:
 *  1. npm run build
 *  2. node serverClient.js
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ─── Constants ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3030;
const HOST = process.env.HOST || '0.0.0.0';
const BACKEND_URL = process.env.VITE_API_URL || 'http://localhost:8000';

// ─── Middleware: Security / CSP ──────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://apis.google.com",
        ],
        "style-src": [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
        ],
        "style-src-elem": [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
        ],
        "font-src": [
          "'self'",
          "https://fonts.gstatic.com",
          "data:",
        ],
        "img-src": [
          "'self'",
          "data:",
          "blob:",
          "https:",
          "http:",
        ],
        "connect-src": [
          "'self'",
          BACKEND_URL,
          "https://fonts.googleapis.com",
          "https://fonts.gstatic.com",
        ],
        "worker-src": ["'self'", "blob:"],
        "object-src":      ["'none'"],
        "base-uri":        ["'self'"],
        "frame-ancestors": ["'self'"],
      },
    },
  })
);

// ─── Static Files ────────────────────────────────────────────────────────────
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// ─── SPA Routing ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  console.log('--------------------------------------------------');
  console.log(`🚀 SignalMDM Frontend Server Running (ESM Mode)`);
  console.log(`🔗 URL: http://${HOST}:${PORT}`);
  console.log(`📡 Backend: ${BACKEND_URL}`);
  console.log(`📂 Serving from: ${distPath}`);
  console.log('--------------------------------------------------');
});
