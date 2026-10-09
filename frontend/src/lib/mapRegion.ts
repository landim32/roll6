/**
 * The element the map is drawn in (041): with the chat below it the map no longer fills the window, so centering
 * (zoom buttons, opening on the character) uses this region's size. Falls back to the window before it mounts.
 */
let region: HTMLElement | null = null;

export const setMapRegion = (element: HTMLElement | null): void => {
  region = element;
};

/** Center of the visible map, in the map region's own pixels. */
export const mapRegionCenter = (): [number, number] => {
  const width = region?.clientWidth || window.innerWidth;
  const height = region?.clientHeight || window.innerHeight;
  return [width / 2, height / 2];
};
