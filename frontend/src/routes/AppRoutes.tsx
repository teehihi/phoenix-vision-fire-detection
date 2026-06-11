import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { AlertsPage } from '../features/alerts/AlertsPage';
import { AuthPage } from '../features/auth/AuthPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { CameraMonitoringProvider } from '../features/detection/CameraMonitoringContext';
import { LiveDetectionPage } from '../features/detection/LiveDetectionPage';
import { HistoryPage } from '../features/history/HistoryPage';
import { LegalPage } from '../features/legal/LegalPage';
import { SettingsPage } from '../features/settings/SettingsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/terms" element={<LegalPage type="terms" />} />
      <Route path="/privacy" element={<LegalPage type="privacy" />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<CameraMonitoringProvider><AppLayout /></CameraMonitoringProvider>}>
          <Route index element={<LiveDetectionPage />} />
          <Route path="/statistics" element={<DashboardPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
