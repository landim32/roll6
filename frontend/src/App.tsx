import { lazy, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast, Toaster } from 'sonner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { MainPage } from './pages/MainPage';
import { AnimationEditorPage, AnimationEditorRedirect } from './pages/AnimationEditorPage';
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
const WeaponCreatePage = lazy(() => import('./pages/library/WeaponCreatePage'));
const AnimationsPage = lazy(() => import('./pages/library/AnimationsPage'));
const AnimationEditPage = lazy(() => import('./pages/library/AnimationEditPage'));
const AnimationCreatePage = lazy(() => import('./pages/library/AnimationCreatePage'));

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
        <Route path="/animation/:id" element={<AnimationEditorRedirect />} />
        <Route path="/library" element={<ProtectedRoute><LibraryLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="campaigns" replace />} />
          {/* 090: each submenu is a route; the key remounts the page so a search never leaks into the next submenu. */}
          <Route path="campaigns" element={<CampaignsPage key="mine" subsection="mine" />} />
          <Route path="campaigns/search" element={<CampaignsPage key="search" subsection="search" />} />
          <Route path="campaigns/playing" element={<CampaignsPage key="playing" subsection="playing" />} />
          <Route path="campaigns/new" element={<CampaignCreatePage />} />
          <Route path="campaigns/:slug" element={<Navigate to="characters" replace />} />
          <Route path="campaigns/:slug/:section" element={<CampaignEditPage />} />
          <Route path="maps" element={<MapsPage key="mine" subsection="mine" />} />
          <Route path="maps/search" element={<MapsPage key="search" subsection="search" />} />
          <Route path="maps/campaign" element={<MapsPage key="campaign" subsection="campaign" />} />
          <Route path="maps/:id" element={<MapEditPage />} />
          <Route path="characters" element={<CharactersPage />} />
          <Route path="characters/:id" element={<CharacterEditPage />} />
          <Route path="npcs" element={<NpcsPage />} />
          <Route path="npcs/:id" element={<NpcEditPage />} />
          <Route path="tokens" element={<TokensPage key="mine" subsection="mine" />} />
          <Route path="tokens/search" element={<TokensPage key="search" subsection="search" />} />
          <Route path="tokens/:id" element={<TokenEditPage />} />
          <Route path="weapons" element={<WeaponsPage key="mine" subsection="mine" />} />
          <Route path="weapons/search" element={<WeaponsPage key="search" subsection="search" />} />
          <Route path="weapons/new" element={<WeaponCreatePage />} />
          <Route path="weapons/:id" element={<WeaponEditPage />} />
          <Route path="animations" element={<AnimationsPage key="mine" subsection="mine" />} />
          <Route path="animations/search" element={<AnimationsPage key="search" subsection="search" />} />
          <Route path="animations/new" element={<AnimationCreatePage />} />
          <Route path="animations/:id" element={<AnimationEditPage />} />
          <Route path="animations/:id/editor" element={<AnimationEditorPage />} />
          <Route path="*" element={<Navigate to="campaigns" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster theme="dark" position="bottom-left" richColors closeButton />
    </>
  );
};

export default App;
