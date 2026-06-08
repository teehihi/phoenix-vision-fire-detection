import { HashRouter } from 'react-router-dom';
import { AuthProvider } from '../features/auth/AuthContext';
import { AppRoutes } from '../routes/AppRoutes';

export function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}
