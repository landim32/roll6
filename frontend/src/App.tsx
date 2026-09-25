import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast, Toaster } from 'sonner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { MainPage } from './pages/MainPage';

/** Routes (/login public, / protected) and the dark toaster. */
export const App = () => {
  const { t } = useTranslation();
  const { setOnSessionExpired } = useAuth();

  // Any 401 from the API logs out (AuthProvider) and tells the user why.
  useEffect(() => {
    setOnSessionExpired(() => toast.error(t('toast.sessionExpired')));
    return () => setOnSessionExpired(undefined);
  }, [setOnSessionExpired, t]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><MainPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster theme="dark" position="bottom-left" richColors closeButton />
    </>
  );
};

export default App;
