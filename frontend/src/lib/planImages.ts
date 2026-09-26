/**
 * Images inside plan markdown (018): the text keeps only `roll6-image:{fileName}` (the uploaded file name, like
 * every entity), and the temporary URL is looked up when rendering — so saved text never holds a link that
 * expires. Mirror of `CampaignPlan.IMAGE_PREFIX` in the backend.
 */

export const PLAN_IMAGE_PREFIX = 'roll6-image:';

/** Markdown for an uploaded image; brackets in the alt text are dropped so the syntax stays valid. */
export const planImageMarkdown = (fileName: string, alt = ''): string =>
  `![${alt.replace(/[[\]]/g, '')}](${PLAN_IMAGE_PREFIX}${fileName})`;

/** URL to show for an image `src`: plan references go through the map; anything else is left as is. */
export const resolvePlanImage = (src: string | undefined, urls: Record<string, string>): string | undefined => {
  if (!src || !src.startsWith(PLAN_IMAGE_PREFIX)) return src;
  return urls[src.slice(PLAN_IMAGE_PREFIX.length)];
};

/** Inserts a block (e.g. an image) at the cursor, on its own line. */
export const insertAt = (text: string, position: number, snippet: string): string => {
  const at = Math.max(0, Math.min(position, text.length));
  const before = text.slice(0, at);
  const after = text.slice(at);
  const lead = before.length === 0 || before.endsWith('\n') ? '' : '\n';
  const tail = after.length === 0 || after.startsWith('\n') ? '' : '\n';
  return `${before}${lead}${snippet}${tail}${after}`;
};
