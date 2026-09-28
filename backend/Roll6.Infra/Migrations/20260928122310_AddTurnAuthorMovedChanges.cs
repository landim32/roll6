using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddTurnAuthorMovedChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "changes",
                table: "turns",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "moved",
                table: "turns",
                type: "integer",
                nullable: true);

            // The author becomes required (024): add it empty, fill the existing entries, then require it.
            migrationBuilder.AddColumn<long>(
                name: "user_id",
                table: "turns",
                type: "bigint",
                nullable: true);

            // Moves and actions of a character were made by its owner; everything else (NPCs, results) by the master.
            migrationBuilder.Sql("""
                UPDATE turns AS t
                SET user_id = c.user_id
                FROM characters AS c
                WHERE t.user_id IS NULL
                  AND t.character_id = c.character_id
                  AND t.turn_type IN (1, 2);

                UPDATE turns AS t
                SET user_id = cp.user_id
                FROM campaigns AS cp
                WHERE t.user_id IS NULL
                  AND t.campaign_id = cp.campaign_id;
                """);

            migrationBuilder.AlterColumn<long>(
                name: "user_id",
                table: "turns",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_turns_user",
                table: "turns",
                column: "user_id");

            migrationBuilder.AddForeignKey(
                name: "fk_user_turn",
                table: "turns",
                column: "user_id",
                principalTable: "users",
                principalColumn: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_user_turn",
                table: "turns");

            migrationBuilder.DropIndex(
                name: "ix_turns_user",
                table: "turns");

            migrationBuilder.DropColumn(
                name: "changes",
                table: "turns");

            migrationBuilder.DropColumn(
                name: "moved",
                table: "turns");

            migrationBuilder.DropColumn(
                name: "user_id",
                table: "turns");
        }
    }
}
