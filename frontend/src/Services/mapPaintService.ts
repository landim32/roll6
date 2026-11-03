import type {
  HexContentInfo, MapDrawingInfo, MapDrawingInsertInfo, MapHexMarksInfo, MapPaintChangeInfo, MapPaintInfo,
} from '../types/mapPaint';
import { API_URL, getHeaders, handleApiResponse } from './apiHelpers';

const API_BASE = `${API_URL}/api/map`;

interface MapPaintServiceConfig {
  onUnauthorized?: () => void;
}

/** Map Paint Service (107) — marks and drawings of a campaign map (reads: master + approved; writes: master). */
class MapPaintService {
  private config: MapPaintServiceConfig;

  constructor(config: MapPaintServiceConfig = {}) {
    this.config = config;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    return handleApiResponse<T>(response, this.config.onUnauthorized);
  }

  /** Marks (inside the current grid) and drawings of the map. */
  async getPaint(mapId: number): Promise<MapPaintInfo> {
    const response = await fetch(`${API_BASE}/${mapId}/paint`, { headers: getHeaders(true) });
    return this.handleResponse<MapPaintInfo>(response);
  }

  /** Upserts/removes up to 200 hex marks at once (`kind: null` removes). */
  async setHexMarks(mapId: number, data: MapHexMarksInfo): Promise<MapPaintChangeInfo> {
    const response = await fetch(`${API_BASE}/${mapId}/hex-marks`, {
      method: 'PUT', headers: getHeaders(true), body: JSON.stringify(data),
    });
    return this.handleResponse<MapPaintChangeInfo>(response);
  }

  /** Adds a rectangle, circle, pencil stroke, line or arrow. */
  async addDrawing(mapId: number, data: MapDrawingInsertInfo): Promise<MapDrawingInfo> {
    const response = await fetch(`${API_BASE}/${mapId}/drawing`, {
      method: 'POST', headers: getHeaders(true), body: JSON.stringify(data),
    });
    return this.handleResponse<MapDrawingInfo>(response);
  }

  /** Removes one drawing. */
  async deleteDrawing(mapId: number, mapDrawingId: number): Promise<void> {
    const response = await fetch(`${API_BASE}/${mapId}/drawing/${mapDrawingId}`, {
      method: 'DELETE', headers: getHeaders(true),
    });
    return this.handleResponse<void>(response);
  }

  /** Removes every mark and drawing of the map. */
  async clearPaint(mapId: number): Promise<void> {
    const response = await fetch(`${API_BASE}/${mapId}/paint`, { method: 'DELETE', headers: getHeaders(true) });
    return this.handleResponse<void>(response);
  }

  /** Mark and pieces of one hex. */
  async getHexContent(mapId: number, x: number, y: number): Promise<HexContentInfo> {
    const response = await fetch(`${API_BASE}/${mapId}/hex?x=${x}&y=${y}`, { headers: getHeaders(true) });
    return this.handleResponse<HexContentInfo>(response);
  }
}

export const mapPaintService = new MapPaintService();
export default MapPaintService;
