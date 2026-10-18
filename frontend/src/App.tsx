import { lazy, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast, Toaster } from 'sonner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { MainPage } from './pages/MainPage';
import { AnimationEditorPage } from './pages/AnimationEditorPage';
import { LibraryLayout } from './pages/library/LibraryLayout';

// The library pages (087) are lazy: the table's bundle does not grow with them.
const CampaignsPage = lazy(() => import('./pages/library/CampaignsPage'));
const CampaignCreatePage = lazy(() => import('./pages/library/CampaignCreatePage'));
const CampaignEditPage = lazy(() => import('./pages/library/CampaignEditPage'));
const MapsPage = lazy(() => import('./pages/library/MapsPage'));
const MapEditPage = lazy(() => import('./pages/library/MapEditPage'));
const CharactersPage = lazy(() => import('./pages/library/CharactersPage'));
const CharacterEditPage = lazy(() => import('./pages/library/CharacterEditPage'));
const NpcsPage = lazy(() => import('./pages/library/NpcsPage'));
const NpcEditPage = lazy(() => import('./pages/library/NpcEditPage'));
const TokensPage = lazy(() => import('./pages/library/TokensPage'));
const TokenEditPage = lazy(() => import('./pages/library/TokenEditPage'));
const WeaponsPage = lazy(() => import('./pages/library/WeaponsPage'));
const WeaponEditPage = lazy(() => import('./pages/library/WeaponEditPage'));
const AnimationsPage = lazy(() => import('./pages/library/AnimationsPage'));
const AnimationEditPage = lazy(() => import('./pages/library/AnimationEditPage'));

/** Routes (/login public; the table, the animation editor and the library — 087 — protected) and the dark toaster. */
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
        <Route path="/campaign/:slug" element={<ProtectedRoute><MainPage /></ProtectedRoute>} />
        <Route path="/map/:slug" element={<ProtectedRoute><MainPage /></ProtectedRoute>} />
        <Route path="/animation/:id" element={<ProtectedRoute><AnimationEditorPage /></ProtectedRoute>} />
        <Route path="/library" element={<ProtectedRoute><LibraryLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="campaigns" replace />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="campaigns/new" element={<CampaignCreatePage />} />
          <Route path="campaigns/:slug" element={<Navigate to="characters" replace />} />
          <Route path="campaigns/:slug/:section" element={<CampaignEditPage />} />
          <Route path="maps" element={<MapsPage />} />
          <Route path="maps/:id" element={<MapEditPage />} />
          <Route path="characters" element={<CharactersPage />} />
          <Route path="characters/:id" element={<CharacterEditPage />} />
          <Route path="npcs" element={<NpcsPage />} />
          <Route path="npcs/:id" element={<NpcEditPage />} />
          <Route path="tokens" element={<TokensPage />} />
          <Route path="tokens/:id" element={<TokenEditPage />} />
          <Route path="weapons" element={<WeaponsPage />} />
          <Route path="weapons/:id" element={<WeaponEditPage />} />
          <Route path="animations" element={<AnimationsPage />} />
          <Route path="animations/:id" element={<AnimationEditPage />} />
          <Route path="*" element={<Navigate to="campaigns" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster theme="dark" position="bottom-left" richColors closeButton />
    </>
  );
};

export default App;
