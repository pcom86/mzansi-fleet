using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MzansiFleet.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddMechanicalRequestFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "MechanicalRequests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeclineReason",
                table: "MechanicalRequests",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "MechanicalRequests",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "RequestedBy",
                table: "MechanicalRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RequestedByType",
                table: "MechanicalRequests",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ScheduledBy",
                table: "MechanicalRequests",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "ScheduledDate",
                table: "MechanicalRequests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ServiceProvider",
                table: "MechanicalRequests",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "MechanicalRequests");

            migrationBuilder.DropColumn(
                name: "DeclineReason",
                table: "MechanicalRequests");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "MechanicalRequests");

            migrationBuilder.DropColumn(
                name: "RequestedBy",
                table: "MechanicalRequests");

            migrationBuilder.DropColumn(
                name: "RequestedByType",
                table: "MechanicalRequests");

            migrationBuilder.DropColumn(
                name: "ScheduledBy",
                table: "MechanicalRequests");

            migrationBuilder.DropColumn(
                name: "ScheduledDate",
                table: "MechanicalRequests");

            migrationBuilder.DropColumn(
                name: "ServiceProvider",
                table: "MechanicalRequests");
        }
    }
}
