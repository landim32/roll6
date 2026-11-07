/**
 * Build id of the site (110): the build's UTC time, `yyyyMMddHHmmss` plus a short random suffix, so two builds never
 * share one (a republish of the same commit is seen too). Pure: `vite.config.ts` uses it to embed `__APP_VERSION__` and
 * to write `dist/version.json`.
 */
export const buildVersion = (date: Date, random: () => number = Math.random): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`
    + `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
  const suffix = Math.floor(random() * 36 ** 4).toString(36).padStart(4, '0');
  return `${stamp}-${suffix}`;
};

/** Body of `/version.json`. */
export const versionJson = (version: string): string => JSON.stringify({ version });
