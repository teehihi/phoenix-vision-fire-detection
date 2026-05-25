import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { AlertsPage } from '../features/alerts/AlertsPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LiveDetectionPage } from '../features/detection/LiveDetectionPage';
import { HistoryPage } from '../features/history/HistoryPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/live" element={<LiveDetectionPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
      </Route>
    </Routes>
  );
}
