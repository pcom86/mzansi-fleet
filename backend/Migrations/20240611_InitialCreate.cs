using System;
using Microsoft.EntityFrameworkCore.Migrations;

namespace MzansiFleet.Migrations
{
    public partial class InitialCreate : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Tenants
            migrationBuilder.CreateTable(
                name: "Tenants",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Name = table.Column<string>(nullable: true),
                    ContactEmail = table.Column<string>(nullable: true),
                    ContactPhone = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tenants", x => x.Id);
                });

            // PayoutBatches (independent)
            migrationBuilder.CreateTable(
                name: "PayoutBatches",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    ScheduledAt = table.Column<DateTime>(nullable: false),
                    State = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PayoutBatches", x => x.Id);
                });

            // DisputeCases (independent)
            migrationBuilder.CreateTable(
                name: "DisputeCases",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    RelatedEntityId = table.Column<Guid>(nullable: false),
                    EntityType = table.Column<string>(nullable: true),
                    Reason = table.Column<string>(nullable: true),
                    State = table.Column<string>(nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DisputeCases", x => x.Id);
                });

            // LedgerEntries (independent)
            migrationBuilder.CreateTable(
                name: "LedgerEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    RelatedEntityId = table.Column<Guid>(nullable: false),
                    EntityType = table.Column<string>(nullable: true),
                    Amount = table.Column<decimal>(nullable: false),
                    Type = table.Column<string>(nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LedgerEntries", x => x.Id);
                });

            // Users
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    TenantId = table.Column<Guid>(nullable: false),
                    Email = table.Column<string>(nullable: true),
                    Phone = table.Column<string>(nullable: true),
                    PasswordHash = table.Column<string>(nullable: true),
                    Role = table.Column<string>(nullable: true),
                    IsActive = table.Column<bool>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_TenantId",
                table: "Users",
                column: "TenantId");

            // Vehicles
            migrationBuilder.CreateTable(
                name: "Vehicles",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    TenantId = table.Column<Guid>(nullable: false),
                    Registration = table.Column<string>(nullable: true),
                    Make = table.Column<string>(nullable: true),
                    Model = table.Column<string>(nullable: true),
                    Year = table.Column<int>(nullable: false),
                    VIN = table.Column<string>(nullable: true),
                    EngineNumber = table.Column<string>(nullable: true),
                    Odometer = table.Column<int>(nullable: false),
                    Capacity = table.Column<int>(nullable: false),
                    Type = table.Column<string>(nullable: true),
                    BaseLocation = table.Column<string>(nullable: true),
                    Status = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Vehicles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Vehicles_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_TenantId",
                table: "Vehicles",
                column: "TenantId");

            // Profiles
            migrationBuilder.CreateTable(
                name: "OwnerProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    UserId = table.Column<Guid>(nullable: false),
                    CompanyName = table.Column<string>(nullable: true),
                    Address = table.Column<string>(nullable: true),
                    ContactName = table.Column<string>(nullable: true),
                    ContactPhone = table.Column<string>(nullable: true),
                    ContactEmail = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OwnerProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OwnerProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OwnerProfiles_UserId",
                table: "OwnerProfiles",
                column: "UserId");

            migrationBuilder.CreateTable(
                name: "StaffProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    UserId = table.Column<Guid>(nullable: false),
                    Role = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StaffProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StaffProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StaffProfiles_UserId",
                table: "StaffProfiles",
                column: "UserId");

            migrationBuilder.CreateTable(
                name: "DriverProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    UserId = table.Column<Guid>(nullable: false),
                    Name = table.Column<string>(nullable: true),
                    Phone = table.Column<string>(nullable: true),
                    Email = table.Column<string>(nullable: true),
                    PhotoUrl = table.Column<string>(nullable: true),
                    IsActive = table.Column<bool>(nullable: false),
                    IsAvailable = table.Column<bool>(nullable: false),
                    AssignedVehicleId = table.Column<Guid>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DriverProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DriverProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DriverProfiles_Vehicles_AssignedVehicleId",
                        column: x => x.AssignedVehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DriverProfiles_UserId",
                table: "DriverProfiles",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_DriverProfiles_AssignedVehicleId",
                table: "DriverProfiles",
                column: "AssignedVehicleId");

            migrationBuilder.CreateTable(
                name: "PassengerProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    UserId = table.Column<Guid>(nullable: false),
                    Name = table.Column<string>(nullable: true),
                    Phone = table.Column<string>(nullable: true),
                    Email = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PassengerProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PassengerProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PassengerProfiles_UserId",
                table: "PassengerProfiles",
                column: "UserId");

            migrationBuilder.CreateTable(
                name: "MechanicProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    UserId = table.Column<Guid>(nullable: false),
                    BusinessName = table.Column<string>(nullable: true),
                    Contact = table.Column<string>(nullable: true),
                    ServiceLocation = table.Column<string>(nullable: true),
                    ServiceRadiusKm = table.Column<double>(nullable: true),
                    Categories = table.Column<string>(nullable: true),
                    VehicleTypes = table.Column<string>(nullable: true),
                    IsActive = table.Column<bool>(nullable: false),
                    DefaultCallOutFee = table.Column<decimal>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MechanicProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MechanicProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MechanicProfiles_UserId",
                table: "MechanicProfiles",
                column: "UserId");

            migrationBuilder.CreateTable(
                name: "ShopProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    UserId = table.Column<Guid>(nullable: false),
                    ShopName = table.Column<string>(nullable: true),
                    Address = table.Column<string>(nullable: true),
                    Hours = table.Column<string>(nullable: true),
                    Contact = table.Column<string>(nullable: true),
                    FulfillmentOptions = table.Column<string>(nullable: true),
                    IsActive = table.Column<bool>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShopProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShopProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ShopProfiles_UserId",
                table: "ShopProfiles",
                column: "UserId");

            // Fleet-related
            migrationBuilder.CreateTable(
                name: "VehicleDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    VehicleId = table.Column<Guid>(nullable: false),
                    DocumentType = table.Column<string>(nullable: true),
                    FileUrl = table.Column<string>(nullable: true),
                    UploadedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VehicleDocuments_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VehicleDocuments_VehicleId",
                table: "VehicleDocuments",
                column: "VehicleId");

            migrationBuilder.CreateTable(
                name: "MaintenanceEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    VehicleId = table.Column<Guid>(nullable: false),
                    Date = table.Column<DateTime>(nullable: false),
                    Odometer = table.Column<int>(nullable: false),
                    Description = table.Column<string>(nullable: true),
                    Vendor = table.Column<string>(nullable: true),
                    Cost = table.Column<decimal>(nullable: false),
                    Attachments = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaintenanceEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaintenanceEvents_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceEvents_VehicleId",
                table: "MaintenanceEvents",
                column: "VehicleId");

            migrationBuilder.CreateTable(
                name: "ServiceRules",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    VehicleId = table.Column<Guid>(nullable: false),
                    RuleType = table.Column<string>(nullable: true),
                    IntervalDays = table.Column<int>(nullable: true),
                    IntervalKm = table.Column<int>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceRules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ServiceRules_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ServiceRules_VehicleId",
                table: "ServiceRules",
                column: "VehicleId");

            migrationBuilder.CreateTable(
                name: "PartRules",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    VehicleId = table.Column<Guid>(nullable: false),
                    PartName = table.Column<string>(nullable: true),
                    IntervalDays = table.Column<int>(nullable: true),
                    IntervalKm = table.Column<int>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PartRules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PartRules_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PartRules_VehicleId",
                table: "PartRules",
                column: "VehicleId");

            // Trips
            migrationBuilder.CreateTable(
                name: "TripRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    PassengerId = table.Column<Guid>(nullable: false),
                    TenantId = table.Column<Guid>(nullable: false),
                    PickupLocation = table.Column<string>(nullable: true),
                    DropoffLocation = table.Column<string>(nullable: true),
                    RequestedTime = table.Column<DateTime>(nullable: false),
                    PassengerCount = table.Column<int>(nullable: false),
                    Notes = table.Column<string>(nullable: true),
                    IsPooling = table.Column<bool>(nullable: false),
                    State = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TripRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TripRequests_Users_PassengerId",
                        column: x => x.PassengerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TripRequests_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TripRequests_PassengerId",
                table: "TripRequests",
                column: "PassengerId");

            migrationBuilder.CreateIndex(
                name: "IX_TripRequests_TenantId",
                table: "TripRequests",
                column: "TenantId");

            migrationBuilder.CreateTable(
                name: "TripOffers",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    TripRequestId = table.Column<Guid>(nullable: false),
                    DriverId = table.Column<Guid>(nullable: false),
                    OfferPrice = table.Column<decimal>(nullable: false),
                    Expiry = table.Column<DateTime>(nullable: false),
                    State = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TripOffers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TripOffers_Users_DriverId",
                        column: x => x.DriverId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TripOffers_TripRequests_TripRequestId",
                        column: x => x.TripRequestId,
                        principalTable: "TripRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TripOffers_DriverId",
                table: "TripOffers",
                column: "DriverId");

            migrationBuilder.CreateIndex(
                name: "IX_TripOffers_TripRequestId",
                table: "TripOffers",
                column: "TripRequestId");

            migrationBuilder.CreateTable(
                name: "TripBookings",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    TripRequestId = table.Column<Guid>(nullable: false),
                    TripOfferId = table.Column<Guid>(nullable: false),
                    VehicleId = table.Column<Guid>(nullable: false),
                    DriverId = table.Column<Guid>(nullable: false),
                    PassengerId = table.Column<Guid>(nullable: false),
                    State = table.Column<string>(nullable: true),
                    ConfirmedAt = table.Column<DateTime>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TripBookings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TripBookings_Users_DriverId",
                        column: x => x.DriverId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TripBookings_Users_PassengerId",
                        column: x => x.PassengerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TripBookings_TripOffers_TripOfferId",
                        column: x => x.TripOfferId,
                        principalTable: "TripOffers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TripBookings_TripRequests_TripRequestId",
                        column: x => x.TripRequestId,
                        principalTable: "TripRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TripBookings_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TripBookings_TripRequestId",
                table: "TripBookings",
                column: "TripRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_TripBookings_TripOfferId",
                table: "TripBookings",
                column: "TripOfferId");

            migrationBuilder.CreateIndex(
                name: "IX_TripBookings_VehicleId",
                table: "TripBookings",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_TripBookings_DriverId",
                table: "TripBookings",
                column: "DriverId");

            migrationBuilder.CreateIndex(
                name: "IX_TripBookings_PassengerId",
                table: "TripBookings",
                column: "PassengerId");

            migrationBuilder.CreateTable(
                name: "TripStops",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    TripBookingId = table.Column<Guid>(nullable: false),
                    Location = table.Column<string>(nullable: true),
                    StopOrder = table.Column<int>(nullable: false),
                    Notes = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TripStops", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TripStops_TripBookings_TripBookingId",
                        column: x => x.TripBookingId,
                        principalTable: "TripBookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TripStops_TripBookingId",
                table: "TripStops",
                column: "TripBookingId");

            // PoolingGroups (no direct FK to TripBookings in entities; leaving as independent)
            migrationBuilder.CreateTable(
                name: "PoolingGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PoolingGroups", x => x.Id);
                });

            // Marketplace
            migrationBuilder.CreateTable(
                name: "MechanicalRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    OwnerId = table.Column<Guid>(nullable: false),
                    VehicleId = table.Column<Guid>(nullable: true),
                    Location = table.Column<string>(nullable: true),
                    Category = table.Column<string>(nullable: true),
                    Description = table.Column<string>(nullable: true),
                    MediaUrls = table.Column<string>(nullable: true),
                    PreferredTime = table.Column<DateTime>(nullable: true),
                    CallOutRequired = table.Column<bool>(nullable: false),
                    State = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MechanicalRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MechanicalRequests_Users_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MechanicalRequests_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MechanicalRequests_OwnerId",
                table: "MechanicalRequests",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_MechanicalRequests_VehicleId",
                table: "MechanicalRequests",
                column: "VehicleId");

            migrationBuilder.CreateTable(
                name: "Quotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    MechanicalRequestId = table.Column<Guid>(nullable: false),
                    MechanicId = table.Column<Guid>(nullable: false),
                    LaborFee = table.Column<decimal>(nullable: false),
                    CallOutFee = table.Column<decimal>(nullable: true),
                    ETA = table.Column<DateTime>(nullable: false),
                    Notes = table.Column<string>(nullable: true),
                    Expiry = table.Column<DateTime>(nullable: false),
                    State = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Quotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Quotes_Users_MechanicId",
                        column: x => x.MechanicId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Quotes_MechanicalRequests_MechanicalRequestId",
                        column: x => x.MechanicalRequestId,
                        principalTable: "MechanicalRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Quotes_MechanicId",
                table: "Quotes",
                column: "MechanicId");

            migrationBuilder.CreateIndex(
                name: "IX_Quotes_MechanicalRequestId",
                table: "Quotes",
                column: "MechanicalRequestId");

            migrationBuilder.CreateTable(
                name: "ServiceBookings",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    MechanicalRequestId = table.Column<Guid>(nullable: false),
                    QuoteId = table.Column<Guid>(nullable: false),
                    MechanicId = table.Column<Guid>(nullable: false),
                    OwnerId = table.Column<Guid>(nullable: false),
                    State = table.Column<string>(nullable: true),
                    ConfirmedAt = table.Column<DateTime>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceBookings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ServiceBookings_Users_MechanicId",
                        column: x => x.MechanicId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ServiceBookings_Users_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ServiceBookings_Quotes_QuoteId",
                        column: x => x.QuoteId,
                        principalTable: "Quotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ServiceBookings_MechanicalRequests_MechanicalRequestId",
                        column: x => x.MechanicalRequestId,
                        principalTable: "MechanicalRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ServiceBookings_MechanicalRequestId",
                table: "ServiceBookings",
                column: "MechanicalRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceBookings_QuoteId",
                table: "ServiceBookings",
                column: "QuoteId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceBookings_MechanicId",
                table: "ServiceBookings",
                column: "MechanicId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceBookings_OwnerId",
                table: "ServiceBookings",
                column: "OwnerId");

            // Products/Inventory/Orders
            migrationBuilder.CreateTable(
                name: "Products",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    ShopId = table.Column<Guid>(nullable: false),
                    SKU = table.Column<string>(nullable: true),
                    Title = table.Column<string>(nullable: true),
                    Category = table.Column<string>(nullable: true),
                    Condition = table.Column<string>(nullable: true),
                    Price = table.Column<decimal>(nullable: false),
                    StockQty = table.Column<int>(nullable: false),
                    PhotoUrls = table.Column<string>(nullable: true),
                    Compatibility = table.Column<string>(nullable: true),
                    IsActive = table.Column<bool>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Products", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Products_Users_ShopId",
                        column: x => x.ShopId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Products_ShopId",
                table: "Products",
                column: "ShopId");

            migrationBuilder.CreateTable(
                name: "Inventories",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    ProductId = table.Column<Guid>(nullable: false),
                    Quantity = table.Column<int>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Inventories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Inventories_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Inventories_ProductId",
                table: "Inventories",
                column: "ProductId");

            migrationBuilder.CreateTable(
                name: "Orders",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    BuyerId = table.Column<Guid>(nullable: false),
                    ShopId = table.Column<Guid>(nullable: false),
                    PlacedAt = table.Column<DateTime>(nullable: false),
                    FulfillmentOption = table.Column<string>(nullable: true),
                    State = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Orders_Users_BuyerId",
                        column: x => x.BuyerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Orders_Users_ShopId",
                        column: x => x.ShopId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Orders_BuyerId",
                table: "Orders",
                column: "BuyerId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_ShopId",
                table: "Orders",
                column: "ShopId");

            migrationBuilder.CreateTable(
                name: "OrderItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    OrderId = table.Column<Guid>(nullable: false),
                    ProductId = table.Column<Guid>(nullable: false),
                    Quantity = table.Column<int>(nullable: false),
                    Price = table.Column<decimal>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderItems_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrderItems_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_OrderId",
                table: "OrderItems",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_ProductId",
                table: "OrderItems",
                column: "ProductId");

            // Reviews
            migrationBuilder.CreateTable(
                name: "Reviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    ReviewerId = table.Column<Guid>(nullable: false),
                    TargetId = table.Column<Guid>(nullable: false),
                    TargetType = table.Column<string>(nullable: true),
                    Rating = table.Column<int>(nullable: false),
                    Comments = table.Column<string>(nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Reviews_Users_ReviewerId",
                        column: x => x.ReviewerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_ReviewerId",
                table: "Reviews",
                column: "ReviewerId");

            // Payments
            migrationBuilder.CreateTable(
                name: "PaymentIntents",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    PayerId = table.Column<Guid>(nullable: false),
                    Amount = table.Column<decimal>(nullable: false),
                    Currency = table.Column<string>(nullable: true),
                    State = table.Column<string>(nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentIntents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentIntents_Users_PayerId",
                        column: x => x.PayerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentIntents_PayerId",
                table: "PaymentIntents",
                column: "PayerId");

            migrationBuilder.CreateTable(
                name: "PaymentTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    PaymentIntentId = table.Column<Guid>(nullable: false),
                    Type = table.Column<string>(nullable: true),
                    Amount = table.Column<decimal>(nullable: false),
                    State = table.Column<string>(nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentTransactions_PaymentIntents_PaymentIntentId",
                        column: x => x.PaymentIntentId,
                        principalTable: "PaymentIntents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_PaymentIntentId",
                table: "PaymentTransactions",
                column: "PaymentIntentId");

            migrationBuilder.CreateTable(
                name: "PayoutItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    PayoutBatchId = table.Column<Guid>(nullable: false),
                    PayeeId = table.Column<Guid>(nullable: false),
                    Amount = table.Column<decimal>(nullable: false),
                    State = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PayoutItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PayoutItems_PayoutBatches_PayoutBatchId",
                        column: x => x.PayoutBatchId,
                        principalTable: "PayoutBatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PayoutItems_Users_PayeeId",
                        column: x => x.PayeeId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PayoutItems_PayoutBatchId",
                table: "PayoutItems",
                column: "PayoutBatchId");

            migrationBuilder.CreateIndex(
                name: "IX_PayoutItems_PayeeId",
                table: "PayoutItems",
                column: "PayeeId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop in reverse order of dependencies
            migrationBuilder.DropTable(name: "PayoutItems");
            migrationBuilder.DropTable(name: "PaymentTransactions");
            migrationBuilder.DropTable(name: "Reviews");
            migrationBuilder.DropTable(name: "OrderItems");
            migrationBuilder.DropTable(name: "Inventories");
            migrationBuilder.DropTable(name: "ServiceBookings");
            migrationBuilder.DropTable(name: "Quotes");
            migrationBuilder.DropTable(name: "MechanicalRequests");
            migrationBuilder.DropTable(name: "TripStops");
            migrationBuilder.DropTable(name: "TripBookings");
            migrationBuilder.DropTable(name: "TripOffers");
            migrationBuilder.DropTable(name: "TripRequests");
            migrationBuilder.DropTable(name: "PartRules");
            migrationBuilder.DropTable(name: "ServiceRules");
            migrationBuilder.DropTable(name: "MaintenanceEvents");
            migrationBuilder.DropTable(name: "VehicleDocuments");
            migrationBuilder.DropTable(name: "DriverProfiles");
            migrationBuilder.DropTable(name: "ShopProfiles");
            migrationBuilder.DropTable(name: "MechanicProfiles");
            migrationBuilder.DropTable(name: "PassengerProfiles");
            migrationBuilder.DropTable(name: "StaffProfiles");
            migrationBuilder.DropTable(name: "OwnerProfiles");
            migrationBuilder.DropTable(name: "Orders");
            migrationBuilder.DropTable(name: "Products");
            migrationBuilder.DropTable(name: "PayoutBatches");
            migrationBuilder.DropTable(name: "PaymentIntents");
            migrationBuilder.DropTable(name: "LedgerEntries");
            migrationBuilder.DropTable(name: "DisputeCases");
            migrationBuilder.DropTable(name: "PoolingGroups");
            migrationBuilder.DropTable(name: "Vehicles");
            migrationBuilder.DropTable(name: "Users");
            migrationBuilder.DropTable(name: "Tenants");
        }
    }
}
