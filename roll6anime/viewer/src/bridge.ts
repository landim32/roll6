import type { AnimationFile } from '@roll6/lib/animationFormat';

/** Messages from the WPF window (062, contracts/viewer-bridge.md). */
export type HostMessage =
  | { type: 'model'; url: string; name: string }
  | { type: 'animation'; fileName: string; file: AnimationFile; keepTime: boolean }
  | { type: 'clear' }
  /** A print of the view as it is on screen, for the request to the Claude. */
  | { type: 'capture'; id: number };

/** Messages to the WPF window. */
export type ViewerMessage =
  | { type: 'ready' }
  | { type: 'modelLoaded'; mixamo: boolean; bones: number }
  | { type: 'modelError'; message: string }
  | { type: 'animationError'; message: string }
  /**
   * The print asked by `capture`: the PNG (base64, no `data:` prefix), the instant (null without an animation) and the
   * camera around the character (`azimuth` 0° = in front, positive toward its left; `elevation` above its middle),
   * or why it failed.
   */
  | { type: 'captured'; id: number; png: string; time: number | null; duration: number | null; paused: boolean; azimuth: number; elevation: number }
  | { type: 'captureFailed'; id: number; message: string };

/** The part of WebView2's `window.chrome.webview` the view uses. */
interface WebViewHost {
  postMessage: (message: unknown) => void;
  addEventListener: (type: 'message', listener: (event: { data: unknown }) => void) => void;
}

const host = (): WebViewHost | undefined =>
  (window as unknown as { chrome?: { webview?: WebViewHost } }).chrome?.webview;

/** Sends a message to the window; outside the WebView2 (a browser tab) it only logs it. */
export const send = (message: ViewerMessage): void => {
  const target = host();
  if (target) target.postMessage(message);
  else console.info('[roll6anime]', message);
};

const isHostMessage = (data: unknown): data is HostMessage =>
  typeof data === 'object' && data !== null && typeof (data as { type?: unknown }).type === 'string';

/** Listens to the window's messages, then says `ready` (the window queues what it sends before that). */
export const listen = (handler: (message: HostMessage) => void): void => {
  const target = host();
  if (target) {
    target.addEventListener('message', (event) => { if (isHostMessage(event.data)) handler(event.data); });
  }
  // A browser tab (development): the same messages through window.postMessage.
  window.addEventListener('message', (event) => { if (isHostMessage(event.data)) handler(event.data); });
  send({ type: 'ready' });
};
