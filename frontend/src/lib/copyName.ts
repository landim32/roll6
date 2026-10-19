/**
 * The name of a copy in a library: "Teste" → "Teste (2)", "Teste (2)" → "Teste (3)", skipping names already taken
 * (compared without case or surrounding spaces) and kept inside `max` characters (the base is cut, never the number).
 */

const NUMBERED = /^(.*?)\s\((\d+)\)$/;

/** The name without a " (n)" suffix: what the copies of a copy are numbered from. */
export const copyBase = (name: string): string => {
  const trimmed = name.trim();
  const match = NUMBERED.exec(trimmed);
  return (match ? match[1] : trimmed) || trimmed;
};

export const copyName = (name: string, taken: readonly string[], max = 100): string => {
  const trimmed = name.trim();
  const match = NUMBERED.exec(trimmed);
  const base = copyBase(name);
  const has = new Set(taken.map((item) => item.trim().toLowerCase()));
  for (let n = match ? Number(match[2]) + 1 : 2; ; n++) {
    const suffix = ` (${n})`;
    const candidate = base.slice(0, max - suffix.length).trimEnd() + suffix;
    if (!has.has(candidate.toLowerCase())) return candidate;
  }
};
