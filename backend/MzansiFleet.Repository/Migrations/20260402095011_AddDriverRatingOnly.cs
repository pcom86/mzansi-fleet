using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MzansiFleet.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddDriverRatingOnly : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "AverageRating",
                table: "DriverProfiles",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastRatingUpdate",
                table: "DriverProfiles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TotalReviews",
                table: "DriverProfiles",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TotalTrips",
                table: "DriverProfiles",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AverageRating",
                table: "DriverProfiles");

            migrationBuilder.DropColumn(
                name: "LastRatingUpdate",
                table: "DriverProfiles");

            migrationBuilder.DropColumn(
                name: "TotalReviews",
                table: "DriverProfiles");

            migrationBuilder.DropColumn(
                name: "TotalTrips",
                table: "DriverProfiles");
        }
    }
}
