using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddNpcStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "npcs",
                type: "character varying(260)",
                maxLength: 260,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "status",
                table: "npcs");
        }
    }
}
