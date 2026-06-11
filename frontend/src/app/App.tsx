import { HashRouter } from 'react-router-dom';
import { AuthProvider } from '../features/auth/AuthContext';
import { AppRoutes } from '../routes/AppRoutes';
import { LanguageProvider } from '../lib/i18n';

export function App() {
  return (
    <LanguageProvider>
      <HashRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </HashRouter>
    </LanguageProvider>
  );
}
