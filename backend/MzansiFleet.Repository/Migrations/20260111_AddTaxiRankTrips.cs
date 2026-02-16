using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MzansiFleet.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddTaxiRankTrips : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TaxiRanks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false),
                    Address = table.Column<string>(type: "text", nullable: false),
                    City = table.Column<string>(type: "text", nullable: false),
                    Province = table.Column<string>(type: "text", nullable: false),
                    Latitude = table.Column<decimal>(type: "numeric", nullable: true),
                    Longitude = table.Column<decimal>(type: "numeric", nullable: true),
                    Capacity = table.Column<int>(type: "integer", nullable: true),
                    OperatingHours = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaxiRanks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TaxiMarshalProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    TaxiRankId = table.Column<Guid>(type: "uuid", nullable: false),
                    MarshalCode = table.Column<string>(type: "text", nullable: false),
                    FullName = table.Column<string>(type: "text", nullable: false),
                    PhoneNumber = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: true),
                    HireDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    IdNumber = table.Column<string>(type: "text", nullable: true),
                    Address = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaxiMarshalProfiles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TaxiRankAdmins",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    TaxiRankId = table.Column<Guid>(type: "uuid", nullable: false),
                    AdminCode = table.Column<string>(type: "text", nullable: false),
                    FullName = table.Column<string>(type: "text", nullable: false),
                    PhoneNumber = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: true),
                    HireDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    IdNumber = table.Column<string>(type: "text", nullable: true),
                    Address = table.Column<string>(type: "text", nullable: true),
                    CanManageMarshals = table.Column<bool>(type: "boolean", nullable: false),
                    CanManageVehicles = table.Column<bool>(type: "boolean", nullable: false),
                    CanManageSchedules = table.Column<bool>(type: "boolean", nullable: false),
                    CanViewReports = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaxiRankAdmins", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TaxiRankTrips",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleId = table.Column<Guid>(type: "uuid", nullable: false),
                    DriverId = table.Column<Guid>(type: "uuid", nullable: true),
                    MarshalId = table.Column<Guid>(type: "uuid", nullable: true),
                    TaxiRankId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartureStation = table.Column<string>(type: "text", nullable: false),
                    DestinationStation = table.Column<string>(type: "text", nullable: false),
                    DepartureTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ArrivalTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TotalAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalCosts = table.Column<decimal>(type: "numeric", nullable: false),
                    NetAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    PassengerCount = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaxiRankTrips", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TripSchedules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TaxiRankId = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    RouteName = table.Column<string>(type: "text", nullable: false),
                    DepartureStation = table.Column<string>(type: "text", nullable: false),
                    DestinationStation = table.Column<string>(type: "text", nullable: false),
                    DepartureTime = table.Column<TimeSpan>(type: "interval", nullable: false),
                    FrequencyMinutes = table.Column<int>(type: "integer", nullable: false),
                    DaysOfWeek = table.Column<string>(type: "text", nullable: false),
                    StandardFare = table.Column<decimal>(type: "numeric", nullable: false),
                    ExpectedDurationMinutes = table.Column<int>(type: "integer", nullable: true),
                    MaxPassengers = table.Column<int>(type: "integer", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TripSchedules", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VehicleTaxiRanks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleId = table.Column<Guid>(type: "uuid", nullable: false),
                    TaxiRankId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RemovedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleTaxiRanks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TripCosts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TaxiRankTripId = table.Column<Guid>(type: "uuid", nullable: false),
                    AddedByDriverId = table.Column<Guid>(type: "uuid", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    ReceiptNumber = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TripCosts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TripCosts_TaxiRankTrips_TaxiRankTripId",
                        column: x => x.TaxiRankTripId,
                        principalTable: "TaxiRankTrips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TripPassengers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TaxiRankTripId = table.Column<Guid>(type: "uuid", nullable: false),
                    PassengerName = table.Column<string>(type: "text", nullable: true),
                    PassengerPhone = table.Column<string>(type: "text", nullable: true),
                    DepartureStation = table.Column<string>(type: "text", nullable: false),
                    ArrivalStation = table.Column<string>(type: "text", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    SeatNumber = table.Column<int>(type: "integer", nullable: true),
                    BoardedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TripPassengers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TripPassengers_TaxiRankTrips_TaxiRankTripId",
                        column: x => x.TaxiRankTripId,
                        principalTable: "TaxiRankTrips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TripCosts_TaxiRankTripId",
                table: "TripCosts",
                column: "TaxiRankTripId");

            migrationBuilder.CreateIndex(
                name: "IX_TripPassengers_TaxiRankTripId",
                table: "TripPassengers",
                column: "TaxiRankTripId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TaxiRanks");

            migrationBuilder.DropTable(
                name: "TaxiMarshalProfiles");

            migrationBuilder.DropTable(
                name: "TaxiRankAdmins");

            migrationBuilder.DropTable(
                name: "TripCosts");

            migrationBuilder.DropTable(
                name: "TripPassengers");

            migrationBuilder.DropTable(
                name: "TripSchedules");

            migrationBuilder.DropTable(
                name: "VehicleTaxiRanks");

            migrationBuilder.DropTable(
                name: "TaxiRankTrips");
        }
    }
}