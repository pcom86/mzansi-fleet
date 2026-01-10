using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MzansiFleet.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddStuffRequestsAndQuotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StuffRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PassengerId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemDescription = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ItemCategory = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    EstimatedWeight = table.Column<decimal>(type: "numeric", nullable: true),
                    Size = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PickupLocation = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    DeliveryLocation = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    EstimatedDistance = table.Column<decimal>(type: "numeric", nullable: true),
                    RequestedPickupDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RequestedDeliveryDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Priority = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SpecialInstructions = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ApprovedQuoteId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StuffRequests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StuffQuotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StuffRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleId = table.Column<Guid>(type: "uuid", nullable: true),
                    QuotedPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    EstimatedPickupTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EstimatedDeliveryTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StuffQuotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StuffQuotes_StuffRequests_StuffRequestId",
                        column: x => x.StuffRequestId,
                        principalTable: "StuffRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StuffQuotes_StuffRequestId",
                table: "StuffQuotes",
                column: "StuffRequestId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StuffQuotes");

            migrationBuilder.DropTable(
                name: "StuffRequests");
        }
    }
}
