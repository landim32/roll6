import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Options as SanitizeSchema } from 'rehype-sanitize';
import { resolvePlanImage } from '../../lib/planImages';

/** The default (GitHub-like) sanitize schema, plus plan image references in `src` (018). */
const PLAN_SCHEMA: SanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    src: [...(defaultSchema.protocols?.src ?? ['http', 'https']), 'roll6-image'],
  },
};

/**
 * Rendering options for plan markdown (editor preview and read-only view): sanitized with the extended schema,
 * raw HTML skipped entirely, and `roll6-image:` references turned into the current image URLs. The sanitizer
 * runs before `urlTransform`, so every other URL arriving there already passed its protocol check.
 */
export const planMarkdownOptions = (imageUrls: Record<string, string>) => ({
  rehypePlugins: [[rehypeSanitize, PLAN_SCHEMA]] as [[typeof rehypeSanitize, SanitizeSchema]],
  skipHtml: true,
  urlTransform: (url: string) => resolvePlanImage(url, imageUrls) ?? '',
});
