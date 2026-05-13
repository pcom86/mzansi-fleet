using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MzansiFleet.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddEnhancedExpenseFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasReceipt",
                table: "VehicleExpenses",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsMechanical",
                table: "VehicleExpenses",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "LaborCost",
                table: "VehicleExpenses",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LaborDescription",
                table: "VehicleExpenses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MechanicName",
                table: "VehicleExpenses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MechanicalCategory",
                table: "VehicleExpenses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NextServiceDate",
                table: "VehicleExpenses",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OdometerReading",
                table: "VehicleExpenses",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PartsCost",
                table: "VehicleExpenses",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PartsReplaced",
                table: "VehicleExpenses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptFileName",
                table: "VehicleExpenses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptFileUrl",
                table: "VehicleExpenses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptImageUrl",
                table: "VehicleExpenses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WarrantyInfo",
                table: "VehicleExpenses",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HasReceipt",
                table: "VehicleExpenses");

            migrationBuilder.DropColumn(
                name: "IsMechanical",
                table: "VehicleExpenses");

            migrationBuilder.DropColumn(
                name: "LaborCost",
                table: "VehicleExpenses");

            migrationBuilder.DropColumn(
                name: "LaborDescription",
                table: "VehicleExpenses");

            migrationBuilder.DropColumn(
                name: "MechanicName",
                table: "VehicleExpenses");

            migrationBuilder.DropColumn(
                name: "MechanicalCategory",
                table: "VehicleExpenses");

            migrationBuilder.DropColumn(
                name: "NextServiceDate",
                table: "VehicleExpenses");

            migrationBuilder.DropColumn(
                name: "OdometerReading",
                table: "VehicleExpenses");

            migrationBuilder.DropColumn(
                name: "PartsCost",
                table: "VehicleExpenses");

            migrationBuilder.DropColumn(
                name: "PartsReplaced",
                table: "VehicleExpenses");

            migrationBuilder.DropColumn(
                name: "ReceiptFileName",
                table: "VehicleExpenses");

            migrationBuilder.DropColumn(
                name: "ReceiptFileUrl",
                table: "VehicleExpenses");

            migrationBuilder.DropColumn(
                name: "ReceiptImageUrl",
                table: "VehicleExpenses");

            migrationBuilder.DropColumn(
                name: "WarrantyInfo",
                table: "VehicleExpenses");
        }
    }
}
