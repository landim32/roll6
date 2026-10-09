/** Real-time table types (017) — mirror the backend TableEventInfo / TableEventType. */

/** Event kinds; `resync` is local (emitted after (re)joining a campaign: reload everything). */
export const TABLE_EVENT = {
  mapTokenUpserted: 'mapToken.upserted',
  mapTokenDeleted: 'mapToken.deleted',
  mapTokensChanged: 'mapTokens.changed',
  partyChanged: 'party.changed',
  campaignNpcsChanged: 'campaignNpcs.changed',
  turnChanged: 'turn.changed',
  turnFinished: 'turn.finished',
  mapSaved: 'map.saved',
  mapsChanged: 'maps.changed',
  mapDeleted: 'map.deleted',
  mapCurrent: 'map.current',
  campaignChanged: 'campaign.changed',
  campaignDeleted: 'campaign.deleted',
  /** A chat message or end-of-turn divider was saved (041); data = ChatItemInfo. */
  chatMessage: 'chat.message',
  /** A chat message or narration was deleted (041); data = { itemKey }. */
  chatDeleted: 'chat.deleted',
  /** A chat entry changed in place (044): reactions, converted, cancelled; data = ChatItemInfo. */
  chatUpdated: 'chat.updated',
  resync: 'resync',
} as const;

export type TableEventType = (typeof TABLE_EVENT)[keyof typeof TABLE_EVENT];

/** An event of the current campaign; `data` depends on the type (see data-model.md). */
export interface TableEvent {
  type: TableEventType;
  campaignId: number;
  /** Map affected, when the change belongs to one; null on map-wide signals means "every map". */
  mapId: number | null;
  actorUserId: number;
  data: unknown;
}

/** State of the real-time connection. */
export const REALTIME_STATUS = {
  connected: 'connected',
  reconnecting: 'reconnecting',
  disconnected: 'disconnected',
} as const;

export type RealtimeStatus = (typeof REALTIME_STATUS)[keyof typeof REALTIME_STATUS];
