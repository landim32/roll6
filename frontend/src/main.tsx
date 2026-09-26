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
import { MapTokenProvider } from './Contexts/MapTokenContext';
import { NpcProvider } from './Contexts/NpcContext';
import { TokenProvider } from './Contexts/TokenContext';
import { TurnProvider } from './Contexts/TurnContext';

// Provider chain: Auth → Campaign (needs the session) → Character (needs the campaign) → MapEditor →
// Token (library) → MapToken (pieces of the open map: needs the editor, the campaign and the characters) →
// Npc (library and campaign NPCs; places pieces, so it needs MapToken) → Turn (turn of the current campaign;
// resetting reloads the pieces) → App.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CampaignProvider>
          <CharacterProvider>
            <MapEditorProvider>
              <TokenProvider>
                <MapTokenProvider>
                  <NpcProvider>
                    <TurnProvider>
                      <App />
                    </TurnProvider>
                  </NpcProvider>
                </MapTokenProvider>
              </TokenProvider>
            </MapEditorProvider>
          </CharacterProvider>
        </CampaignProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
