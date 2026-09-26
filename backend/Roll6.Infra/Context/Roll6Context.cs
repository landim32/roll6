using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Roll6.Domain.Enums;
using Roll6.Domain.Models;

namespace Roll6.Infra.Context;

public class Roll6Context : DbContext
{
    private const string TIMESTAMP = "timestamp without time zone";

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
            entity.Property(e => e.Open).HasColumnName("open");
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
            entity.Property(e => e.CharacterStatus).HasColumnName("character_status").HasMaxLength(260);
            entity.Property(e => e.Sheet).HasColumnName("sheet").HasMaxLength(20000);
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

        modelBuilder.Entity<MapNpc>(entity =>
        {
            entity.ToTable("map_npcs");
            entity.HasKey(e => e.MapNpcId).HasName("map_npcs_pkey");
            entity.Property(e => e.MapNpcId).HasColumnName("map_npc_id").UseIdentityAlwaysColumn();
            entity.Property(e => e.MapId).HasColumnName("map_id");
            entity.Property(e => e.NpcId).HasColumnName("npc_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(260).IsRequired();
            entity.Property(e => e.Life).HasColumnName("life");
            entity.Property(e => e.Energy).HasColumnName("energy");
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(260);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType(TIMESTAMP).HasDefaultValueSql("now()");
            entity.HasOne<Map>().WithMany().HasForeignKey(e => e.MapId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_map_map_npc");
            entity.HasOne<Npc>().WithMany().HasForeignKey(e => e.NpcId)
                .OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_npc_map_npc");
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
