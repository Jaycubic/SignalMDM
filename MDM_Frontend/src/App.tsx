import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import SourceSystems from './pages/source/SourceSystems';
import IngestionRuns from './pages/ingestion/IngestionRuns';
import RawLanding from './pages/rawlanding/RawLanding';
import UploadData from './pages/upload/UploadData';
import StagingRecords from './pages/staging/StagingRecords';
import Tenants from './pages/admin/Tenants';
import SystemHealth from './pages/admin/SystemHealth';
import DevSetup from './pages/DevSetup';
import './index.css';

function Placeholder({ title }: { title: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '60vh', gap: '12px',
      color: 'var(--text-muted)',
    }}>
      <span style={{ fontSize: '40px' }}>🚧</span>
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
        {title}
      </h2>
      <p style={{ fontSize: '13px', margin: 0 }}>This screen will be built in a future phase.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public ── */}
          <Route path="/login" element={<Login />} />

          {/* ── Protected shell ── */}
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Placeholder title="Dashboard — Coming Soon" />} />
            <Route path="sources"      element={<SourceSystems />} />
            <Route path="ingestion"    element={<IngestionRuns />} />
            <Route path="upload"       element={<UploadData />} />
            <Route path="raw-landing"  element={<RawLanding />} />
            <Route path="staging"      element={<StagingRecords />} />
            <Route path="tenants"      element={<Tenants />} />
            <Route path="api-logs"     element={<Placeholder title="API Logs — Coming Soon" />} />
            <Route path="system-health" element={<SystemHealth />} />
            <Route path="dev-setup"    element={<DevSetup />} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Route>

          {/* ── Catch-all ── */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
