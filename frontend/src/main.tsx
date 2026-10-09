import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/theme.css';
import './styles/app.css';
import './i18n';
import { App } from './App';
import { AuthProvider } from './Contexts/AuthContext';
import { CampaignProvider } from './Contexts/CampaignContext';
import { ChatProvider } from './Contexts/ChatContext';
import { CharacterProvider } from './Contexts/CharacterContext';
import { MapEditorProvider } from './Contexts/MapEditorContext';
import { MapTokenProvider } from './Contexts/MapTokenContext';
import { NpcProvider } from './Contexts/NpcContext';
import { RealtimeProvider } from './Contexts/RealtimeContext';
import { TokenProvider } from './Contexts/TokenContext';
import { TurnProvider } from './Contexts/TurnContext';

// Provider chain: Auth → Campaign (needs the session) → Realtime (table events of the current campaign; every
// provider below reacts to them) → Character (needs the campaign) → MapEditor →
// Token (library) → MapToken (pieces of the open map: needs the editor, the campaign and the characters) →
// Npc (library and campaign NPCs; places pieces, so it needs MapToken) → Turn (turn of the current campaign;
// resetting reloads the pieces) → Chat (the campaign's timeline: conversation + turn records, 041) → App.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CampaignProvider>
          <RealtimeProvider>
            <CharacterProvider>
              <MapEditorProvider>
                <TokenProvider>
                  <MapTokenProvider>
                    <NpcProvider>
                      <TurnProvider>
                        <ChatProvider>
                          <App />
                        </ChatProvider>
                      </TurnProvider>
                    </NpcProvider>
                  </MapTokenProvider>
                </TokenProvider>
              </MapEditorProvider>
            </CharacterProvider>
          </RealtimeProvider>
        </CampaignProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
