using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddCampaignPendingNotice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "pending_notice",
                table: "campaigns",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "pending_notice",
                table: "campaigns");
        }
    }
}
