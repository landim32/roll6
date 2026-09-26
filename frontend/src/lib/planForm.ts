/** Plan entry form rules (018) — same limits as the backend CampaignPlan. */

export const PLAN_MAX_TITLE = 260;
export const PLAN_MAX_DESCRIPTION = 50000;

export interface PlanDraft {
  title: string;
  description: string;
}

/** i18n key of the first problem, or null when the draft can be saved. */
export const validatePlan = ({ title, description }: PlanDraft): string | null => {
  if (!title.trim()) return 'campaignSettings.titleRequired';
  if (title.trim().length > PLAN_MAX_TITLE) return 'campaignSettings.titleTooLong';
  if (description.trim().length > PLAN_MAX_DESCRIPTION) return 'campaignSettings.descriptionTooLong';
  return null;
};

/** True when the draft differs from what was last saved (surrounding spaces don't count, like the backend). */
export const isPlanDirty = (saved: PlanDraft, draft: PlanDraft): boolean =>
  saved.title.trim() !== draft.title.trim() || saved.description.trim() !== draft.description.trim();
