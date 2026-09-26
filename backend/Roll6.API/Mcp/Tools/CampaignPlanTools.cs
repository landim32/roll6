using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.Domain.Interfaces;
using Roll6.DTO.CampaignPlan;

namespace Roll6.API.Mcp.Tools;

/// <summary>The master's secret campaign plan (020). Mirrors CampaignPlanController; the list is list_campaign_plans.</summary>
[McpServerToolType]
public static class CampaignPlanTools
{
    private const string RETURNS = """
        Returns: { campaignPlanId, campaignId, title, description (markdown), imageUrls (fileName → temporary URL of each
        image referenced as roll6-image:{fileName}), createdAt, changedAt }.
        """;

    private const string DESCRIPTION = "Markdown text (up to 50000 characters). Images: upload with upload_image and write ![caption](roll6-image:{fileName}) — never a URL. Optional.";

    [McpServerTool(Name = "get_campaign_plan", Title = "Get campaign plan entry", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaignplan/{id}")]
    [Description($$"""
        What it does: returns one entry of the campaign plan with its markdown.
        Who can use it: only the master (players never see the plan).
        {{RETURNS}}
        Common errors: 403 not the master, 404 not found.
        Related tools: list_campaign_plans, update_campaign_plan.
        """)]
    public static Task<CallToolResult> GetCampaignPlan(
        ICampaignPlanService plans, IHttpContextAccessor http,
        [Description("Id of the plan entry (campaignPlanId from list_campaign_plans).")] long campaignPlanId) =>
        McpToolRunner.RunAsync(() => plans.GetByIdAsync(McpUser.Id(http), campaignPlanId));

    [McpServerTool(Name = "create_campaign_plan", Title = "Create campaign plan entry", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/campaignplan")]
    [Description($$"""
        What it does: adds an entry (a chapter, session or arc) to the campaign plan — the master's secret notes.
        Who can use it: only the master.
        {{RETURNS}}
        Common errors: 403 not the master, 404 campaign not found, 400 empty title or too long.
        Related tools: upload_image, list_campaign_plans.
        """)]
    public static Task<CallToolResult> CreateCampaignPlan(
        ICampaignPlanService plans, IHttpContextAccessor http,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("Entry title (required, up to 260 characters). Example: \"Chapter 1 - The road\".")] string title,
        [Description(DESCRIPTION)] string? description = null) =>
        McpToolRunner.RunAsync(() => plans.CreateAsync(McpUser.Id(http), new CampaignPlanInsertInfo { CampaignId = campaignId, Title = title, Description = description }));

    [McpServerTool(Name = "update_campaign_plan", Title = "Update campaign plan entry", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/campaignplan/{id}")]
    [Description($$"""
        What it does: replaces the title and text of a plan entry (read it first and send the full new text).
        Who can use it: only the master.
        {{RETURNS}}
        Common errors: 403 not the master, 404 not found, 400 empty title or too long.
        Related tools: get_campaign_plan.
        """)]
    public static Task<CallToolResult> UpdateCampaignPlan(
        ICampaignPlanService plans, IHttpContextAccessor http,
        [Description("Id of the plan entry (campaignPlanId).")] long campaignPlanId,
        [Description("Entry title (required, up to 260 characters).")] string title,
        [Description(DESCRIPTION)] string? description = null) =>
        McpToolRunner.RunAsync(() => plans.UpdateAsync(McpUser.Id(http), campaignPlanId, new CampaignPlanUpdateInfo { Title = title, Description = description }));

    [McpServerTool(Name = "delete_campaign_plan", Title = "Delete campaign plan entry", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/campaignplan/{id}")]
    [Description($$"""
        What it does: deletes one entry of the campaign plan. {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the master.
        Returns: { ok: true }.
        Common errors: 403 not the master, 404 not found.
        Related tools: list_campaign_plans.
        """)]
    public static Task<CallToolResult> DeleteCampaignPlan(
        ICampaignPlanService plans, IHttpContextAccessor http,
        [Description("Id of the plan entry (campaignPlanId).")] long campaignPlanId) =>
        McpToolRunner.RunAsync(() => plans.DeleteAsync(McpUser.Id(http), campaignPlanId));
}
