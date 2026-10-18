using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddWeaponSockets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "grip_x",
                table: "weapons",
                type: "double precision",
                nullable: false,
                defaultValue: 0.5);

            migrationBuilder.AddColumn<double>(
                name: "grip_y",
                table: "weapons",
                type: "double precision",
                nullable: false,
                defaultValue: 0.5);

            migrationBuilder.AddColumn<double>(
                name: "grip_z",
                table: "weapons",
                type: "double precision",
                nullable: false,
                defaultValue: 0.5);

            migrationBuilder.AddColumn<int>(
                name: "pose_rx",
                table: "weapons",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "pose_ry",
                table: "weapons",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "pose_rz",
                table: "weapons",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "token_weapons",
                columns: table => new
                {
                    token_weapon_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    token_id = table.Column<long>(type: "bigint", nullable: false),
                    socket = table.Column<int>(type: "integer", nullable: false),
                    weapon_id = table.Column<long>(type: "bigint", nullable: false),
                    grip = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("token_weapons_pkey", x => x.token_weapon_id);
                    table.ForeignKey(
                        name: "fk_token_token_weapon",
                        column: x => x.token_id,
                        principalTable: "tokens",
                        principalColumn: "token_id");
                    table.ForeignKey(
                        name: "fk_weapon_token_weapon",
                        column: x => x.weapon_id,
                        principalTable: "weapons",
                        principalColumn: "weapon_id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_token_weapons_token_socket",
                table: "token_weapons",
                columns: new[] { "token_id", "socket" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_token_weapons_weapon",
                table: "token_weapons",
                column: "weapon_id");

            // 083: the 082 hands become sockets 1 (right) and 2 (left), keeping the weapon and the size. The position and
            // rotation of the old grip were measured in the bone's frame, which the socket frame replaces, so they are reset.
            migrationBuilder.Sql("""
                INSERT INTO token_weapons (token_id, socket, weapon_id, grip)
                SELECT token_id, 1, right_weapon_id, jsonb_build_object('scale', COALESCE((right_weapon_grip->>'scale')::int, 100))
                  FROM tokens WHERE right_weapon_id IS NOT NULL
                UNION ALL
                SELECT token_id, 2, left_weapon_id, jsonb_build_object('scale', COALESCE((left_weapon_grip->>'scale')::int, 100))
                  FROM tokens WHERE left_weapon_id IS NOT NULL;
                """);

            migrationBuilder.DropForeignKey(
                name: "fk_token_left_weapon",
                table: "tokens");

            migrationBuilder.DropForeignKey(
                name: "fk_token_right_weapon",
                table: "tokens");

            migrationBuilder.DropIndex(
                name: "ix_tokens_left_weapon",
                table: "tokens");

            migrationBuilder.DropIndex(
                name: "ix_tokens_right_weapon",
                table: "tokens");

            migrationBuilder.DropColumn(
                name: "left_weapon_grip",
                table: "tokens");

            migrationBuilder.DropColumn(
                name: "left_weapon_id",
                table: "tokens");

            migrationBuilder.DropColumn(
                name: "right_weapon_grip",
                table: "tokens");

            migrationBuilder.DropColumn(
                name: "right_weapon_id",
                table: "tokens");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "left_weapon_grip",
                table: "tokens",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "left_weapon_id",
                table: "tokens",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "right_weapon_grip",
                table: "tokens",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "right_weapon_id",
                table: "tokens",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_tokens_left_weapon",
                table: "tokens",
                column: "left_weapon_id");

            migrationBuilder.CreateIndex(
                name: "ix_tokens_right_weapon",
                table: "tokens",
                column: "right_weapon_id");

            migrationBuilder.AddForeignKey(
                name: "fk_token_left_weapon",
                table: "tokens",
                column: "left_weapon_id",
                principalTable: "weapons",
                principalColumn: "weapon_id");

            migrationBuilder.AddForeignKey(
                name: "fk_token_right_weapon",
                table: "tokens",
                column: "right_weapon_id",
                principalTable: "weapons",
                principalColumn: "weapon_id");

            migrationBuilder.Sql("""
                UPDATE tokens t SET right_weapon_id = w.weapon_id, right_weapon_grip = w.grip
                  FROM token_weapons w WHERE w.token_id = t.token_id AND w.socket = 1;
                UPDATE tokens t SET left_weapon_id = w.weapon_id, left_weapon_grip = w.grip
                  FROM token_weapons w WHERE w.token_id = t.token_id AND w.socket = 2;
                """);

            migrationBuilder.DropTable(
                name: "token_weapons");

            migrationBuilder.DropColumn(
                name: "grip_x",
                table: "weapons");

            migrationBuilder.DropColumn(
                name: "grip_y",
                table: "weapons");

            migrationBuilder.DropColumn(
                name: "grip_z",
                table: "weapons");

            migrationBuilder.DropColumn(
                name: "pose_rx",
                table: "weapons");

            migrationBuilder.DropColumn(
                name: "pose_ry",
                table: "weapons");

            migrationBuilder.DropColumn(
                name: "pose_rz",
                table: "weapons");
        }
    }
}
