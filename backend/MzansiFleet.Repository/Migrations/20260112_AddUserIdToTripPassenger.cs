using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MzansiFleet.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddUserIdToTripPassenger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "TripPassengers",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_TripPassengers_UserId",
                table: "TripPassengers",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_TripPassengers_Users_UserId",
                table: "TripPassengers",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TripPassengers_Users_UserId",
                table: "TripPassengers");

            migrationBuilder.DropIndex(
                name: "IX_TripPassengers_UserId",
                table: "TripPassengers");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "TripPassengers");
        }
    }
}