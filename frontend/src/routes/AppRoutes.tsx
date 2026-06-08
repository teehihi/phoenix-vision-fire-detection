import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { AlertsPage } from '../features/alerts/AlertsPage';
import { AuthPage } from '../features/auth/AuthPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LiveDetectionPage } from '../features/detection/LiveDetectionPage';
import { HistoryPage } from '../features/history/HistoryPage';
import { LegalPage } from '../features/legal/LegalPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/terms" element={<LegalPage type="terms" />} />
      <Route path="/privacy" element={<LegalPage type="privacy" />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/live" element={<LiveDetectionPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
