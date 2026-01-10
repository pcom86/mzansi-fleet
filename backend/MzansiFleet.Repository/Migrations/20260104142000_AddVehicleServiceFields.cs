using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MzansiFleet.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleServiceFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Mileage",
                table: "Vehicles",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastServiceDate",
                table: "Vehicles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NextServiceDate",
                table: "Vehicles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastMaintenanceDate",
                table: "Vehicles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NextMaintenanceDate",
                table: "Vehicles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ServiceIntervalKm",
                table: "Vehicles",
                type: "integer",
                nullable: false,
                defaultValue: 10000);

            migrationBuilder.AddColumn<string>(
                name: "PhotoBase64",
                table: "Vehicles",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Mileage",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "LastServiceDate",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "NextServiceDate",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "LastMaintenanceDate",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "NextMaintenanceDate",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "ServiceIntervalKm",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "PhotoBase64",
                table: "Vehicles");
        }
    }
}
