using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Roll6.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddPushDeliveries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "majority_notified_turn",
                table: "campaigns");

            migrationBuilder.AddColumn<int>(
                name: "failure_count",
                table: "push_subscriptions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "push_deliveries",
                columns: table => new
                {
                    push_delivery_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    push_subscription_id = table.Column<long>(type: "bigint", nullable: false),
                    payload = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    topic = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    attempts = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    next_attempt_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("push_deliveries_pkey", x => x.push_delivery_id);
                    table.ForeignKey(
                        name: "fk_push_delivery_subscription",
                        column: x => x.push_subscription_id,
                        principalTable: "push_subscriptions",
                        principalColumn: "push_subscription_id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_push_deliveries_due",
                table: "push_deliveries",
                column: "next_attempt_at");

            migrationBuilder.CreateIndex(
                name: "ix_push_deliveries_subscription",
                table: "push_deliveries",
                column: "push_subscription_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "push_deliveries");

            migrationBuilder.DropColumn(
                name: "failure_count",
                table: "push_subscriptions");

            migrationBuilder.AddColumn<int>(
                name: "majority_notified_turn",
                table: "campaigns",
                type: "integer",
                nullable: true);
        }
    }
}
