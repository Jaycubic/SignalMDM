import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import SourceSystems from './pages/source/SourceSystems';
import IngestionRuns from './pages/ingestion/IngestionRuns';
import RawLanding from './pages/rawlanding/RawLanding';
import UploadData from './pages/upload/UploadData';
import StagingRecords from './pages/staging/StagingRecords';
import './index.css';

function Placeholder({ title }: { title: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '60vh', gap: '12px', color: 'var(--text-muted)',
    }}>
      <span style={{ fontSize: '40px' }}>🚧</span>
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>{title}</h2>
      <p style={{ fontSize: '13px', margin: 0 }}>This screen will be built in a future phase.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Placeholder title="Dashboard — Coming Soon" />} />
          <Route path="sources" element={<SourceSystems />} />
          <Route path="ingestion" element={<IngestionRuns />} />
          <Route path="upload" element={<UploadData />} />
          <Route path="raw-landing" element={<RawLanding />} />
          <Route path="staging" element={<StagingRecords />} />
          <Route path="api-logs" element={<Placeholder title="API Logs — Coming Soon" />} />
          <Route path="system-health" element={<Placeholder title="System Health — Coming Soon" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
