import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/app.css';
import './i18n';
import { App } from './App';
import { AuthProvider } from './Contexts/AuthContext';
import { CampaignProvider } from './Contexts/CampaignContext';
import { CharacterProvider } from './Contexts/CharacterContext';
import { MapEditorProvider } from './Contexts/MapEditorContext';

// Provider chain: Auth → Campaign (needs the session) → Character (needs the campaign) → MapEditor → App.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CampaignProvider>
          <CharacterProvider>
            <MapEditorProvider>
              <App />
            </MapEditorProvider>
          </CharacterProvider>
        </CampaignProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
