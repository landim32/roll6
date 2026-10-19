import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Options as SanitizeSchema } from 'rehype-sanitize';

/**
 * 093: the answers of the master's Claude are text written by a model that read a player's question, so they are drawn
 * with less than the default schema — no links and no images (a prompt injection could plant a phishing link or a
 * tracking pixel); their text stays, unwrapped.
 */
const STRICT_SCHEMA: SanitizeSchema = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter((tag) => !['a', 'img', 'picture', 'source', 'video', 'audio', 'iframe'].includes(tag)),
};

/** Rendering options for model answers: strict sanitizer, raw HTML skipped, every URL dropped. */
export const strictMarkdownOptions = {
  rehypePlugins: [[rehypeSanitize, STRICT_SCHEMA]] as [[typeof rehypeSanitize, SanitizeSchema]],
  skipHtml: true,
  urlTransform: () => '',
};
