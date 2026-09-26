/** Campaign plan types (018) — mirror the backend CampaignPlan DTOs. */

/** A plan entry in lists (no description). */
export interface CampaignPlanInfo {
  campaignPlanId: number;
  campaignId: number;
  title: string;
  createdAt: string;
  changedAt: string;
}

/** A plan entry with its markdown and the current URL of each image it references. */
export interface CampaignPlanDetailInfo extends CampaignPlanInfo {
  /** Markdown; images are `roll6-image:{fileName}` references. */
  description: string | null;
  /** File name → temporary URL (valid for a while; never saved in the text). */
  imageUrls: Record<string, string>;
}

export interface CampaignPlanInsertInfo {
  campaignId: number;
  title: string;
  description: string | null;
}

export interface CampaignPlanUpdateInfo {
  title: string;
  description: string | null;
}
