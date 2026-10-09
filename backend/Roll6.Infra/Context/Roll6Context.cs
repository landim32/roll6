using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Roll6.Domain.Enums;
using Roll6.Domain.Models;
using Roll6.Domain.Slugs;

namespace Roll6.Infra.Context;

public class Roll6Context : DbContext
{
    private const string TIMESTAMP = "timestamp without time zone";
    private static readonly JsonSerializerOptions TURN_CHANGE_JSON = new(JsonSerializerDefaults.Web);

    public Roll6Context(DbContextOptions<Roll6Context> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<MapModel> MapModels { get; set; }
    public DbSet<Campaign> Campaigns { get; set; }
    public DbSet<Map> Maps { get; set; }
    public DbSet<Token> Tokens { get; set; }
    public DbSet<MapToken> MapTokens { get; set; }
    public DbSet<Character> Characters { get; set; }
    public DbSet<CampaignCharacter> CampaignCharacters { get; set; }
    public DbSet<Npc> Npcs { get; set; }
    public DbSet<CampaignNpc> CampaignNpcs { get; set; }
    public DbSet<MapNpc> MapNpcs { get; set; }
    public DbSet<Turn> Turns { get; set; }
    public DbSet<ChatRead> ChatReads { get; set; }
    public DbSet<PushSubscription> PushSubscriptions { get; set; }
    public DbSet<ChatReaction> ChatReactions { get; set; }
    public DbSet<ChatPollOption> ChatPollOptions { get; set; }
    public DbSet<ChatPollVote> ChatPollVotes { get; set; }
    public DbSet<UserNotification> UserNotifications { get; set; }
    public DbSet<CampaignNotificationPref> CampaignNotificationPrefs { get; set; }
    public DbSet<CampaignPlan> CampaignPlans { get; set; }
    public DbSet<ApiKey> ApiKeys { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.UserId).HasName("users_pkey");
            entity.Property(e => e.UserId).HasColumnName("user_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(260).IsRequired();
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(260).IsRequired();
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash").HasMaxLength(500).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.HasIndex(e => e.Email).IsUnique().HasDatabaseName("ix_users_email");
        });

        modelBuilder.Entity<MapModel>(entity =>
        {
            entity.ToTable("map_models");
            entity.HasKey(e => e.MapModelId).HasName("map_models_pkey");
            entity.Property(e => e.MapModelId).HasColumnName("map_model_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(260).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description").HasMaxLength(2000);
            entity.Property(e => e.Image).HasColumnName("image").HasMaxLength(260);
            entity.Property(e => e.GridWidth).HasColumnName("grid_width")
                .HasDefaultValue(MapModel.DEFAULT_GRID_SIZE).HasSentinel(int.MinValue);
            entity.Property(e => e.GridHeight).HasColumnName("grid_height")
                .HasDefaultValue(MapModel.DEFAULT_GRID_SIZE).HasSentinel(int.MinValue);
            entity.Property(e => e.ImageWidth).HasColumnName("image_width");
            entity.Property(e => e.ImageHeight).HasColumnName("image_height");
            entity.Property(e => e.ImageTop).HasColumnName("image_top").HasDefaultValue(0).HasSentinel(int.MinValue);
            entity.Property(e => e.ImageLeft).HasColumnName("image_left").HasDefaultValue(0).HasSentinel(int.MinValue);
            // 3D view (034): the black and white mask (walls) and the panorama background.
            entity.Property(e => e.MaskImage).HasColumnName("mask_image").HasMaxLength(260);
            entity.Property(e => e.BackgroundImage).HasColumnName("background_image").HasMaxLength(260);
            entity.Property(e => e.WallTextureImage).HasColumnName("wall_texture_image").HasMaxLength(260);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.Property(e => e.ChangedAt).HasColumnName("changed_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            HasOwner(entity, "fk_user_map_model");
        });

        modelBuilder.Entity<Campaign>(entity =>
        {
            entity.ToTable("campaigns");
            entity.HasKey(e => e.CampaignId).HasName("campaigns_pkey");
            entity.Property(e => e.CampaignId).HasColumnName("campaign_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(260).IsRequired();
            entity.Property(e => e.Slug).HasColumnName("slug").HasMaxLength(Slug.MAX_LENGTH).IsRequired();
            entity.HasIndex(e => e.Slug).IsUnique().HasDatabaseName("ix_campaigns_slug");
            entity.Property(e => e.Open).HasColumnName("open");
            entity.Property(e => e.CurrentTurn).HasColumnName("current_turn").HasDefaultValue(1).HasSentinel(0);
            entity.Property(e => e.CurrentMapId).HasColumnName("current_map_id");
            entity.Property(e => e.MajorityNotifiedTurn).HasColumnName("majority_notified_turn");
            // Map the table follows (017); a map belongs to its campaign, so no navigation both ways.
            entity.HasOne<Map>().WithMany().HasForeignKey(e => e.CurrentMapId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_map_campaign_current");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            HasOwner(entity, "fk_user_campaign");
        });

        modelBuilder.Entity<Map>(entity =>
        {
            entity.ToTable("maps");
            entity.HasKey(e => e.MapId).HasName("maps_pkey");
            entity.Property(e => e.MapId).HasColumnName("map_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.CampaignId).HasColumnName("campaign_id");
            entity.Property(e => e.MapModelId).HasColumnName("map_model_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Sequence).HasColumnName("sequence");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(260).IsRequired();
            entity.Property(e => e.Slug).HasColumnName("slug").HasMaxLength(Slug.MAX_LENGTH).IsRequired();
            entity.HasIndex(e => e.Slug).IsUnique().HasDatabaseName("ix_maps_slug");
            entity.Property(e => e.Status).HasColumnName("status").HasConversion<int>().HasDefaultValue(MapStatus.Active).HasSentinel((MapStatus)0);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.HasIndex(e => new { e.CampaignId, e.MapModelId, e.Sequence })
                .IsUnique()
                .HasDatabaseName("ix_maps_campaign_model_sequence");
            entity.HasOne<Campaign>().WithMany().HasForeignKey(e => e.CampaignId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_campaign_map");
            entity.HasOne<MapModel>().WithMany().HasForeignKey(e => e.MapModelId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_map_model_map");
            HasOwner(entity, "fk_user_map");
        });

        modelBuilder.Entity<Token>(entity =>
        {
            entity.ToTable("tokens");
            entity.HasKey(e => e.TokenId).HasName("tokens_pkey");
            entity.Property(e => e.TokenId).HasColumnName("token_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(260).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description").HasMaxLength(2000);
            entity.Property(e => e.UpSpace).HasColumnName("up_space").HasDefaultValue(Token.DEFAULT_UP_SPACE).HasSentinel(int.MinValue);
            entity.Property(e => e.DownSpace).HasColumnName("down_space");
            entity.Property(e => e.UpImage).HasColumnName("up_image").HasMaxLength(260);
            entity.Property(e => e.DownImage).HasColumnName("down_image").HasMaxLength(260);
            entity.Property(e => e.FrontImage).HasColumnName("front_image").HasMaxLength(260);
            entity.Property(e => e.RightImage).HasColumnName("right_image").HasMaxLength(260);
            entity.Property(e => e.LeftImage).HasColumnName("left_image").HasMaxLength(260);
            entity.Property(e => e.BackImage).HasColumnName("back_image").HasMaxLength(260);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            HasOwner(entity, "fk_user_token");
        });

        modelBuilder.Entity<MapToken>(entity =>
        {
            entity.ToTable("map_tokens");
            entity.HasKey(e => e.MapTokenId).HasName("map_tokens_pkey");
            entity.Property(e => e.MapTokenId).HasColumnName("map_token_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.MapId).HasColumnName("map_id");
            entity.Property(e => e.TokenId).HasColumnName("token_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(260).IsRequired();
            entity.Property(e => e.TokenType).HasColumnName("token_type").HasConversion<int>();
            entity.Property(e => e.Sheet).HasColumnName("sheet").HasMaxLength(20000);
            entity.Property(e => e.Life).HasColumnName("life");
            entity.Property(e => e.Energy).HasColumnName("energy");
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(260);
            entity.Property(e => e.Move).HasColumnName("move");
            entity.Property(e => e.X).HasColumnName("x");
            entity.Property(e => e.Y).HasColumnName("y");
            entity.Property(e => e.Look).HasColumnName("look").HasDefaultValue(0).HasSentinel(int.MinValue);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.HasOne<Map>().WithMany().HasForeignKey(e => e.MapId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_map_map_token");
            entity.HasOne<Token>().WithMany().HasForeignKey(e => e.TokenId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_token_map_token");
            entity.Property(e => e.CampaignCharacterId).HasColumnName("campaign_character_id");
            entity.HasOne<CampaignCharacter>().WithMany().HasForeignKey(e => e.CampaignCharacterId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_campaign_character_map_token");
            entity.HasIndex(e => new { e.MapId, e.CampaignCharacterId })
                .IsUnique()
                .HasFilter("campaign_character_id IS NOT NULL")
                .HasDatabaseName("ix_map_tokens_map_campaign_character");
            entity.Property(e => e.MapNpcId).HasColumnName("map_npc_id");
            entity.HasOne<MapNpc>().WithMany().HasForeignKey(e => e.MapNpcId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_map_npc_map_token");
            entity.HasIndex(e => e.MapNpcId)
                .IsUnique()
                .HasFilter("map_npc_id IS NOT NULL")
                .HasDatabaseName("ix_map_tokens_map_npc");
        });

        modelBuilder.Entity<Character>(entity =>
        {
            entity.ToTable("characters");
            entity.HasKey(e => e.CharacterId).HasName("characters_pkey");
            entity.Property(e => e.CharacterId).HasColumnName("character_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(260).IsRequired();
            entity.Property(e => e.Sheet).HasColumnName("sheet").HasMaxLength(20000);
            entity.Property(e => e.Life).HasColumnName("life");
            entity.Property(e => e.Energy).HasColumnName("energy");
            entity.Property(e => e.Move).HasColumnName("move");
            entity.Property(e => e.Image).HasColumnName("image").HasMaxLength(260);
            entity.Property(e => e.SheetFile).HasColumnName("sheet_file").HasMaxLength(260);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            HasOwner(entity, "fk_user_character");
            entity.Property(e => e.TokenId).HasColumnName("token_id");
            entity.HasOne<Token>().WithMany().HasForeignKey(e => e.TokenId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_token_character");
        });

        modelBuilder.Entity<CampaignCharacter>(entity =>
        {
            entity.ToTable("campaign_characters");
            entity.HasKey(e => e.CampaignCharacterId).HasName("campaign_characters_pkey");
            entity.Property(e => e.CampaignCharacterId).HasColumnName("campaign_character_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.CampaignId).HasColumnName("campaign_id");
            entity.Property(e => e.CharacterId).HasColumnName("character_id");
            entity.Property(e => e.Status).HasColumnName("status").HasConversion<int>();
            entity.Property(e => e.CurrentLife).HasColumnName("current_life").IsRequired();
            entity.Property(e => e.CurrentEnergy).HasColumnName("current_energy").IsRequired();
            entity.Property(e => e.CurrentMove).HasColumnName("current_move").IsRequired();
            entity.Property(e => e.CharacterStatus).HasColumnName("character_status").HasMaxLength(260);
            entity.Property(e => e.Sheet).HasColumnName("sheet").HasMaxLength(20000);
            entity.Property(e => e.SheetFile).HasColumnName("sheet_file").HasMaxLength(260);
            entity.Property(e => e.Posture).HasColumnName("posture").HasConversion<int>().HasDefaultValue(Posture.Standing).HasSentinel((Posture)0);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.HasIndex(e => new { e.CampaignId, e.CharacterId })
                .IsUnique()
                .HasDatabaseName("ix_campaign_characters_campaign_character");
            entity.HasOne<Campaign>().WithMany().HasForeignKey(e => e.CampaignId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_campaign_campaign_character");
            entity.HasOne<Character>().WithMany().HasForeignKey(e => e.CharacterId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_character_campaign_character");
        });

        modelBuilder.Entity<Npc>(entity =>
        {
            entity.ToTable("npcs");
            entity.HasKey(e => e.NpcId).HasName("npcs_pkey");
            entity.Property(e => e.NpcId).HasColumnName("npc_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.TokenId).HasColumnName("token_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(260).IsRequired();
            entity.Property(e => e.Life).HasColumnName("life");
            entity.Property(e => e.Energy).HasColumnName("energy");
            entity.Property(e => e.Move).HasColumnName("move");
            entity.Property(e => e.Sheet).HasColumnName("sheet").HasMaxLength(20000);
            entity.Property(e => e.Image).HasColumnName("image").HasMaxLength(260);
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(260);
            entity.Property(e => e.Posture).HasColumnName("posture").HasConversion<int>().HasDefaultValue(Posture.Standing).HasSentinel((Posture)0);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            HasOwner(entity, "fk_user_npc");
            entity.HasOne<Token>().WithMany().HasForeignKey(e => e.TokenId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_token_npc");
        });

        modelBuilder.Entity<CampaignNpc>(entity =>
        {
            entity.ToTable("campaign_npcs");
            entity.HasKey(e => e.CampaignNpcId).HasName("campaign_npcs_pkey");
            entity.Property(e => e.CampaignNpcId).HasColumnName("campaign_npc_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.CampaignId).HasColumnName("campaign_id");
            entity.Property(e => e.NpcId).HasColumnName("npc_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.HasIndex(e => new { e.CampaignId, e.NpcId })
                .IsUnique()
                .HasDatabaseName("ix_campaign_npcs_campaign_npc");
            entity.HasOne<Campaign>().WithMany().HasForeignKey(e => e.CampaignId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_campaign_campaign_npc");
            entity.HasOne<Npc>().WithMany().HasForeignKey(e => e.NpcId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_npc_campaign_npc");
        });

        modelBuilder.Entity<ApiKey>(entity =>
        {
            entity.ToTable("api_keys");
            entity.HasKey(e => e.ApiKeyId).HasName("api_keys_pkey");
            entity.Property(e => e.ApiKeyId).HasColumnName("api_key_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(ApiKey.MAX_NAME).IsRequired();
            entity.Property(e => e.KeyPrefix).HasColumnName("key_prefix").HasMaxLength(20).IsRequired();
            entity.Property(e => e.KeyHash).HasColumnName("key_hash").HasMaxLength(64).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at").HasColumnType(TIMESTAMP);
            entity.Property(e => e.LastUsedAt).HasColumnName("last_used_at").HasColumnType(TIMESTAMP);
            entity.Property(e => e.RevokedAt).HasColumnName("revoked_at").HasColumnType(TIMESTAMP);
            entity.HasIndex(e => e.KeyHash).IsUnique().HasDatabaseName("ix_api_keys_hash");
            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_api_keys_user");
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_user_api_key");
        });

        modelBuilder.Entity<CampaignPlan>(entity =>
        {
            entity.ToTable("campaign_plans");
            entity.HasKey(e => e.CampaignPlanId).HasName("campaign_plans_pkey");
            entity.Property(e => e.CampaignPlanId).HasColumnName("campaign_plan_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.CampaignId).HasColumnName("campaign_id");
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(CampaignPlan.MAX_TITLE).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description").HasMaxLength(CampaignPlan.MAX_DESCRIPTION);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.Property(e => e.ChangedAt).HasColumnName("changed_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.HasIndex(e => e.CampaignId).HasDatabaseName("ix_campaign_plans_campaign");
            entity.HasOne<Campaign>().WithMany().HasForeignKey(e => e.CampaignId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_campaign_plan");
        });

        modelBuilder.Entity<MapNpc>(entity =>
        {
            entity.ToTable("map_npcs");
            entity.HasKey(e => e.MapNpcId).HasName("map_npcs_pkey");
            entity.Property(e => e.MapNpcId).HasColumnName("map_npc_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.MapId).HasColumnName("map_id");
            entity.Property(e => e.NpcId).HasColumnName("npc_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(260).IsRequired();
            entity.Property(e => e.CurrentLife).HasColumnName("current_life");
            entity.Property(e => e.CurrentEnergy).HasColumnName("current_energy");
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(260);
            entity.Property(e => e.Posture).HasColumnName("posture").HasConversion<int>().HasDefaultValue(Posture.Standing).HasSentinel((Posture)0);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.HasOne<Map>().WithMany().HasForeignKey(e => e.MapId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_map_map_npc");
            entity.HasOne<Npc>().WithMany().HasForeignKey(e => e.NpcId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_npc_map_npc");
        });

        modelBuilder.Entity<Turn>(entity =>
        {
            entity.ToTable("turns");
            entity.HasKey(e => e.TurnId).HasName("turns_pkey");
            entity.Property(e => e.TurnId).HasColumnName("turn_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.CampaignId).HasColumnName("campaign_id");
            entity.Property(e => e.MapId).HasColumnName("map_id");
            entity.Property(e => e.CharacterId).HasColumnName("character_id");
            entity.Property(e => e.NpcId).HasColumnName("npc_id");
            entity.Property(e => e.MapNpcId).HasColumnName("map_npc_id");
            entity.Property(e => e.TurnNo).HasColumnName("turn_no");
            entity.Property(e => e.TurnType).HasColumnName("turn_type").HasConversion<int>();
            entity.Property(e => e.BeforeX).HasColumnName("before_x");
            entity.Property(e => e.BeforeY).HasColumnName("before_y");
            entity.Property(e => e.BeforeLook).HasColumnName("before_look");
            entity.Property(e => e.X).HasColumnName("x");
            entity.Property(e => e.Y).HasColumnName("y");
            entity.Property(e => e.Look).HasColumnName("look");
            entity.Property(e => e.Description).HasColumnName("description").HasMaxLength(Turn.MAX_NARRATION);
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Moved).HasColumnName("moved");
            // Changed fields (024) as a JSON array: [{ "field", "before", "after" }].
            entity.Property(e => e.Changes).HasColumnName("changes").HasColumnType("jsonb")
                .HasConversion(
                    changes => changes == null ? null : JsonSerializer.Serialize(changes, TURN_CHANGE_JSON),
                    json => json == null ? null : JsonSerializer.Deserialize<List<TurnChange>>(json, TURN_CHANGE_JSON),
                    new ValueComparer<List<TurnChange>?>(
                        (a, b) => JsonSerializer.Serialize(a, TURN_CHANGE_JSON) == JsonSerializer.Serialize(b, TURN_CHANGE_JSON),
                        v => JsonSerializer.Serialize(v, TURN_CHANGE_JSON).GetHashCode(),
                        v => v == null ? null : v.Select(c => new TurnChange(c.Field, c.Before, c.After)).ToList()));
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            // Chat (041): the same timeline holds what people say and the end-of-turn dividers.
            entity.Property(e => e.DisplayName).HasColumnName("display_name").HasMaxLength(260);
            entity.Property(e => e.DisplayImage).HasColumnName("display_image").HasMaxLength(260);
            entity.Property(e => e.Image).HasColumnName("image").HasMaxLength(260);
            entity.Property(e => e.Audio).HasColumnName("audio").HasMaxLength(260);
            entity.Property(e => e.AudioSeconds).HasColumnName("audio_seconds");
            entity.Property(e => e.Dice).HasColumnName("dice").HasMaxLength(100);
            entity.Property(e => e.CancelledAt).HasColumnName("cancelled_at").HasColumnType(TIMESTAMP);
            entity.Property(e => e.ReplyToTurnId).HasColumnName("reply_to_turn_id");
            entity.HasIndex(e => e.ReplyToTurnId).HasDatabaseName("ix_turns_reply_to");
            entity.HasOne<Turn>().WithMany().HasForeignKey(e => e.ReplyToTurnId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_turn_reply");
            entity.Property(e => e.DeletedAt).HasColumnName("deleted_at").HasColumnType(TIMESTAMP);
            entity.HasIndex(e => new { e.CampaignId, e.TurnNo }).HasDatabaseName("ix_turns_campaign_turn");
            entity.HasIndex(e => new { e.CampaignId, e.CreatedAt, e.TurnId }).HasDatabaseName("ix_turns_campaign_created");
            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_turns_user");
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_user_turn");
            entity.HasOne<Campaign>().WithMany().HasForeignKey(e => e.CampaignId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_campaign_turn");
            entity.HasOne<Map>().WithMany().HasForeignKey(e => e.MapId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_map_turn");
            entity.HasOne<Character>().WithMany().HasForeignKey(e => e.CharacterId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_character_turn");
            entity.HasOne<Npc>().WithMany().HasForeignKey(e => e.NpcId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_npc_turn");
            entity.HasOne<MapNpc>().WithMany().HasForeignKey(e => e.MapNpcId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_map_npc_turn");
        });

        modelBuilder.Entity<ChatRead>(entity =>
        {
            entity.ToTable("chat_reads");
            entity.HasKey(e => e.ChatReadId).HasName("chat_reads_pkey");
            entity.Property(e => e.ChatReadId).HasColumnName("chat_read_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.CampaignId).HasColumnName("campaign_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.LastReadAt).HasColumnName("last_read_at").HasColumnType(TIMESTAMP);
            entity.HasIndex(e => new { e.CampaignId, e.UserId }).IsUnique().HasDatabaseName("ix_chat_reads_campaign_user");
            entity.HasOne<Campaign>().WithMany().HasForeignKey(e => e.CampaignId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_campaign_chat_read");
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_user_chat_read");
        });

        modelBuilder.Entity<UserNotification>(entity =>
        {
            entity.ToTable("user_notifications");
            entity.HasKey(e => e.UserNotificationId).HasName("user_notifications_pkey");
            entity.Property(e => e.UserNotificationId).HasColumnName("user_notification_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.CampaignId).HasColumnName("campaign_id");
            entity.Property(e => e.Kind).HasColumnName("kind").HasMaxLength(30).IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(UserNotification.MAX_TITLE).IsRequired();
            entity.Property(e => e.Body).HasColumnName("body").HasMaxLength(UserNotification.MAX_BODY).IsRequired();
            entity.Property(e => e.Url).HasColumnName("url").HasMaxLength(UserNotification.MAX_URL);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType(TIMESTAMP);
            entity.Property(e => e.ReadAt).HasColumnName("read_at").HasColumnType(TIMESTAMP);
            entity.HasIndex(e => new { e.UserId, e.CreatedAt }).HasDatabaseName("ix_user_notifications_user_created");
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_user_user_notification");
            entity.HasOne<Campaign>().WithMany().HasForeignKey(e => e.CampaignId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_campaign_user_notification");
        });

        modelBuilder.Entity<ChatReaction>(entity =>
        {
            entity.ToTable("chat_reactions");
            entity.HasKey(e => e.ChatReactionId).HasName("chat_reactions_pkey");
            entity.Property(e => e.ChatReactionId).HasColumnName("chat_reaction_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.TurnId).HasColumnName("turn_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Kind).HasColumnName("kind").HasConversion<short>();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType(TIMESTAMP);
            entity.HasIndex(e => new { e.TurnId, e.UserId }).IsUnique().HasDatabaseName("ix_chat_reactions_turn_user");
            entity.HasOne<Turn>().WithMany().HasForeignKey(e => e.TurnId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_turn_chat_reaction");
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_user_chat_reaction");
        });

        modelBuilder.Entity<ChatPollOption>(entity =>
        {
            entity.ToTable("chat_poll_options");
            entity.HasKey(e => e.ChatPollOptionId).HasName("chat_poll_options_pkey");
            entity.Property(e => e.ChatPollOptionId).HasColumnName("chat_poll_option_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.TurnId).HasColumnName("turn_id");
            entity.Property(e => e.Position).HasColumnName("position");
            entity.Property(e => e.Text).HasColumnName("text").HasMaxLength(ChatPollOption.MAX_TEXT).IsRequired();
            entity.HasIndex(e => new { e.TurnId, e.Position }).IsUnique().HasDatabaseName("ix_chat_poll_options_turn_position");
            entity.HasOne<Turn>().WithMany().HasForeignKey(e => e.TurnId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_turn_chat_poll_option");
        });

        modelBuilder.Entity<ChatPollVote>(entity =>
        {
            entity.ToTable("chat_poll_votes");
            entity.HasKey(e => e.ChatPollVoteId).HasName("chat_poll_votes_pkey");
            entity.Property(e => e.ChatPollVoteId).HasColumnName("chat_poll_vote_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.TurnId).HasColumnName("turn_id");
            entity.Property(e => e.ChatPollOptionId).HasColumnName("chat_poll_option_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.CharacterId).HasColumnName("character_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType(TIMESTAMP);
            // One vote per character per poll, and one for the master (no character).
            entity.HasIndex(e => new { e.TurnId, e.CharacterId }).IsUnique().HasFilter("character_id IS NOT NULL")
                .HasDatabaseName("ix_chat_poll_votes_character");
            entity.HasIndex(e => e.TurnId).IsUnique().HasFilter("character_id IS NULL").HasDatabaseName("ix_chat_poll_votes_master");
            entity.HasIndex(e => e.ChatPollOptionId).HasDatabaseName("ix_chat_poll_votes_option");
            entity.HasOne<Turn>().WithMany().HasForeignKey(e => e.TurnId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_turn_chat_poll_vote");
            entity.HasOne<ChatPollOption>().WithMany().HasForeignKey(e => e.ChatPollOptionId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_chat_poll_option_vote");
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_user_chat_poll_vote");
            entity.HasOne<Character>().WithMany().HasForeignKey(e => e.CharacterId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_character_chat_poll_vote");
        });

        modelBuilder.Entity<PushSubscription>(entity =>
        {
            entity.ToTable("push_subscriptions");
            entity.HasKey(e => e.PushSubscriptionId).HasName("push_subscriptions_pkey");
            entity.Property(e => e.PushSubscriptionId).HasColumnName("push_subscription_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Endpoint).HasColumnName("endpoint").HasMaxLength(PushSubscription.MAX_ENDPOINT).IsRequired();
            entity.Property(e => e.P256dh).HasColumnName("p256dh").HasMaxLength(200).IsRequired();
            entity.Property(e => e.Auth).HasColumnName("auth").HasMaxLength(100).IsRequired();
            entity.Property(e => e.UserAgent).HasColumnName("user_agent").HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType(TIMESTAMP);
            entity.Property(e => e.LastUsedAt).HasColumnName("last_used_at").HasColumnType(TIMESTAMP);
            entity.HasIndex(e => e.Endpoint).IsUnique().HasDatabaseName("ix_push_subscriptions_endpoint");
            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_push_subscriptions_user");
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_user_push_subscription");
        });

        modelBuilder.Entity<CampaignNotificationPref>(entity =>
        {
            entity.ToTable("campaign_notification_prefs");
            entity.HasKey(e => e.CampaignNotificationPrefId).HasName("campaign_notification_prefs_pkey");
            entity.Property(e => e.CampaignNotificationPrefId).HasColumnName("campaign_notification_pref_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.CampaignId).HasColumnName("campaign_id");
            entity.Property(e => e.Muted).HasColumnName("muted");
            entity.HasIndex(e => new { e.UserId, e.CampaignId }).IsUnique().HasDatabaseName("ix_campaign_notification_prefs_user_campaign");
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_user_notification_pref");
            entity.HasOne<Campaign>().WithMany().HasForeignKey(e => e.CampaignId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_campaign_notification_pref");
        });
    }

    private static void HasOwner<TEntity>(EntityTypeBuilder<TEntity> entity, string constraintName) where TEntity : class
    {
        entity.HasOne<User>()
            .WithMany()
            .HasForeignKey("UserId")
            .OnDelete(DeleteBehavior.ClientSetNull)
            .HasConstraintName(constraintName);
    }
}
