using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class MakeTokenDownSpaceOptional : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "down_space",
                table: "tokens",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 2);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Tokens without a down state must get the old default before the column is NOT NULL again.
            migrationBuilder.Sql("UPDATE tokens SET down_space = 2 WHERE down_space IS NULL;");

            migrationBuilder.AlterColumn<int>(
                name: "down_space",
                table: "tokens",
                type: "integer",
                nullable: false,
                defaultValue: 2,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);
        }
    }
}
