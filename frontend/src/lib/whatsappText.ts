/** Text sent with a shared map: the campaign and map, the turn, and the narration in WhatsApp formatting. */
export interface ShareTextInput {
  campaignName: string;
  mapName: string;
  turnNo: number | null;
  narration: string | null;
  /** Already translated turn line ("Turno 7"). Defaults to `Turno ${turnNo}`. */
  turnLabel?: string | null;
}

const SLOT = '\uE000';

const slot = (kind: string, index: number): string => `${SLOT}${kind}${index}${SLOT}`;

const restore = (text: string, kind: string, values: string[]): string =>
  text.replace(new RegExp(`${SLOT}${kind}(\\d+)${SLOT}`, 'g'), (_, index: string) => values[Number(index)] ?? '');

/**
 * Markdown the table stores, rewritten with the markers WhatsApp understands
 * (`*bold*`, `_italic_`, `~strike~`, `` `code` ``, `- ` lists).
 */
export const markdownToWhatsApp = (md: string): string => {
  const fences: string[] = [];
  const inlines: string[] = [];
  const bolds: string[] = [];
  const escapes: string[] = [];

  let text = md.replace(/```[\s\S]*?```/g, (block) => {
    fences.push(block);
    return slot('F', fences.length - 1);
  });
  text = text.replace(/`[^`\n]+`/g, (code) => {
    inlines.push(code);
    return slot('I', inlines.length - 1);
  });
  text = text.replace(/\\([\\`*_{}[\]()#+\-.!])/g, (_, ch: string) => {
    escapes.push(ch);
    return slot('E', escapes.length - 1);
  });

  text = text.replace(/!\[[^\]]*\]\([^)\s]*\)/g, '');
  text = text.replace(/<\/?[a-zA-Z][^>]*>/g, '');
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1 ($2)');
  text = text.replace(/^#{1,6}[ \t]+(.+?)[ \t]*$/gm, (_, title: string) => {
    bolds.push(`*${title.trim()}*`);
    return slot('B', bolds.length - 1);
  });
  text = text.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, stars: string | undefined, unders: string | undefined) => {
    bolds.push(`*${stars ?? unders ?? ''}*`);
    return slot('B', bolds.length - 1);
  });
  text = text.replace(/~~([^~\n]+)~~/g, '~$1~');
  text = text.replace(
    /(?<!\*)\*([^*\n]+)\*(?!\*)|(?<!_)_([^_\n]+)_(?!_)/g,
    (_, stars: string | undefined, unders: string | undefined) => `_${stars ?? unders ?? ''}_`,
  );
  text = text.replace(/^(\s*)[*+][ \t]+/gm, '$1- ');
  text = text.replace(/\n{3,}/g, '\n\n');

  text = restore(text, 'B', bolds);
  text = restore(text, 'E', escapes);
  text = restore(text, 'I', inlines);
  text = restore(text, 'F', fences);
  return text.trim();
};

/** Header, optional turn line and the converted narration. No narration → the header alone. */
export const buildShareText = ({ campaignName, mapName, turnNo, narration, turnLabel }: ShareTextInput): string => {
  const header = `*${campaignName} — ${mapName}*`;
  const body = narration?.trim() ? markdownToWhatsApp(narration) : '';
  if (!body) return header;
  const turn = turnLabel?.trim() || (turnNo != null ? `Turno ${turnNo}` : '');
  return turn ? `${header}\n\n${turn}\n\n${body}` : `${header}\n\n${body}`;
};
