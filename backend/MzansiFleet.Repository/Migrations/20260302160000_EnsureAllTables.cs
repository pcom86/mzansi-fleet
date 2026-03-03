using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MzansiFleet.Repository.Migrations
{
    /// <inheritdoc />
    public partial class EnsureAllTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── Messages table ─────────────────────────────────────────────────
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""Messages"" (
    ""Id""                  uuid NOT NULL DEFAULT gen_random_uuid(),
    ""SenderId""            uuid NOT NULL,
    ""ReceiverId""          uuid NOT NULL,
    ""Subject""             text NOT NULL DEFAULT '',
    ""Content""             text NOT NULL DEFAULT '',
    ""IsRead""              boolean NOT NULL DEFAULT false,
    ""CreatedAt""           timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""ReadAt""              timestamp with time zone,
    ""RelatedEntityType""   text,
    ""RelatedEntityId""     uuid,
    ""ParentMessageId""     uuid,
    ""IsDeletedBySender""   boolean NOT NULL DEFAULT false,
    ""IsDeletedByReceiver"" boolean NOT NULL DEFAULT false,
    CONSTRAINT ""PK_Messages"" PRIMARY KEY (""Id"")
);");

            // ── Tenders table ──────────────────────────────────────────────────
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""Tenders"" (
    ""Id""                   uuid NOT NULL,
    ""Title""                text NOT NULL DEFAULT '',
    ""Description""          text NOT NULL DEFAULT '',
    ""Status""               text NOT NULL DEFAULT 'Open',
    ""IsActive""             boolean NOT NULL DEFAULT true,
    ""TenderPublisherId""    uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""AwardedToOwnerId""     uuid,
    ""ServiceArea""          text NOT NULL DEFAULT '',
    ""TransportType""        text NOT NULL DEFAULT '',
    ""PickupLocation""       text NOT NULL DEFAULT '',
    ""DropoffLocation""      text NOT NULL DEFAULT '',
    ""RouteDetails""         text NOT NULL DEFAULT '',
    ""RequirementDetails""   text NOT NULL DEFAULT '',
    ""RequiredVehicles""     integer,
    ""BudgetMin""            numeric,
    ""BudgetMax""            numeric,
    ""StartDate""            timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""EndDate""              timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""ApplicationDeadline""  timestamp with time zone,
    ""CreatedAt""            timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""UpdatedAt""            timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ""PK_Tenders"" PRIMARY KEY (""Id"")
);");

            // ── TenderApplications table ───────────────────────────────────────
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""TenderApplications"" (
    ""Id""                    uuid NOT NULL,
    ""TenderId""              uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""OwnerId""               uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""Status""                text NOT NULL DEFAULT 'Pending',
    ""ApplicationMessage""    text NOT NULL DEFAULT '',
    ""ProposalDetails""       text NOT NULL DEFAULT '',
    ""ProposedBudget""        numeric NOT NULL DEFAULT 0,
    ""AvailableVehicles""     integer NOT NULL DEFAULT 0,
    ""VehicleTypes""          text NOT NULL DEFAULT '',
    ""ExperienceHighlights""  text NOT NULL DEFAULT '',
    ""ContactPerson""         text NOT NULL DEFAULT '',
    ""ContactEmail""          text NOT NULL DEFAULT '',
    ""ContactPhone""          text NOT NULL DEFAULT '',
    ""AppliedAt""             timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""ReviewedAt""            timestamp with time zone,
    ""ReviewNotes""           text,
    CONSTRAINT ""PK_TenderApplications"" PRIMARY KEY (""Id"")
);");

            // ── MechanicalRequests – add missing ServiceProviderRating column ──
            migrationBuilder.Sql(@"
ALTER TABLE ""MechanicalRequests"" ADD COLUMN IF NOT EXISTS ""ServiceProviderRating"" integer;
");

            // ── RoadsideAssistanceRequests table ───────────────────────────────
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""RoadsideAssistanceRequests"" (
    ""Id""                    uuid NOT NULL,
    ""UserId""                uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""UserName""              text NOT NULL DEFAULT '',
    ""UserPhone""             text NOT NULL DEFAULT '',
    ""UserRole""              text NOT NULL DEFAULT '',
    ""AssistanceType""        text NOT NULL DEFAULT '',
    ""Status""                text NOT NULL DEFAULT '',
    ""Priority""              text NOT NULL DEFAULT '',
    ""Location""              text NOT NULL DEFAULT '',
    ""Latitude""              text,
    ""Longitude""             text,
    ""IssueDescription""      text NOT NULL DEFAULT '',
    ""VehicleId""             uuid,
    ""VehicleMake""           text,
    ""VehicleModel""          text,
    ""VehicleRegistration""   text,
    ""ServiceProviderId""     uuid,
    ""ServiceProviderName""   text,
    ""ServiceProviderPhone""  text,
    ""TechnicianName""        text,
    ""EstimatedArrivalTime""  text,
    ""EstimatedCost""         numeric,
    ""ActualCost""            numeric,
    ""AssignedAt""            timestamp with time zone,
    ""CompletedAt""           timestamp with time zone,
    ""RequestedAt""           timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""AdditionalNotes""       text,
    ""DriverId""              uuid,
    ""DriverName""            text,
    ""DriverPhone""           text,
    CONSTRAINT ""PK_RoadsideAssistanceRequests"" PRIMARY KEY (""Id"")
);");

            // ── TrackingDeviceRequests table ───────────────────────────────────
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""TrackingDeviceRequests"" (
    ""Id""                         uuid NOT NULL,
    ""OwnerId""                    uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""TenantId""                   uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""VehicleId""                  uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""VehicleMake""                text NOT NULL DEFAULT '',
    ""VehicleModel""               text NOT NULL DEFAULT '',
    ""VehicleRegistration""        text NOT NULL DEFAULT '',
    ""VehicleYear""                integer NOT NULL DEFAULT 0,
    ""DeviceFeatures""             text NOT NULL DEFAULT '',
    ""InstallationLocation""       text NOT NULL DEFAULT '',
    ""PreferredInstallationDate""  text NOT NULL DEFAULT '',
    ""SpecialRequirements""        text NOT NULL DEFAULT '',
    ""BudgetMin""                  numeric,
    ""BudgetMax""                  numeric,
    ""Status""                     text NOT NULL DEFAULT '',
    ""OfferCount""                 integer NOT NULL DEFAULT 0,
    ""CreatedAt""                  timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""UpdatedAt""                  timestamp with time zone,
    CONSTRAINT ""PK_TrackingDeviceRequests"" PRIMARY KEY (""Id"")
);");

            // ── TrackingDeviceOffers table ─────────────────────────────────────
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""TrackingDeviceOffers"" (
    ""Id""                          uuid NOT NULL,
    ""TrackingDeviceRequestId""     uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""ServiceProviderId""           uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""DeviceBrand""                 text NOT NULL DEFAULT '',
    ""DeviceModel""                 text NOT NULL DEFAULT '',
    ""DeviceFeatures""              text NOT NULL DEFAULT '',
    ""InstallationCost""            numeric NOT NULL DEFAULT 0,
    ""DeviceCost""                  numeric NOT NULL DEFAULT 0,
    ""MonthlySubscriptionFee""      numeric NOT NULL DEFAULT 0,
    ""TotalUpfrontCost""            numeric NOT NULL DEFAULT 0,
    ""InstallationDetails""         text NOT NULL DEFAULT '',
    ""EstimatedInstallationTime""   text NOT NULL DEFAULT '',
    ""WarrantyPeriod""              text NOT NULL DEFAULT '',
    ""SupportDetails""              text NOT NULL DEFAULT '',
    ""AdditionalNotes""             text NOT NULL DEFAULT '',
    ""Status""                      text NOT NULL DEFAULT '',
    ""SubmittedAt""                 timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""AvailableFrom""               timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""ResponsedAt""                 timestamp with time zone,
    CONSTRAINT ""PK_TrackingDeviceOffers"" PRIMARY KEY (""Id"")
);");

            // ── RentalOffers table ─────────────────────────────────────────────
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""RentalOffers"" (
    ""Id""                  uuid NOT NULL DEFAULT gen_random_uuid(),
    ""RentalRequestId""     uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""OwnerId""             uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""VehicleId""           uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""Status""              text NOT NULL DEFAULT '',
    ""PricePerDay""         numeric NOT NULL DEFAULT 0,
    ""TotalPrice""          numeric NOT NULL DEFAULT 0,
    ""SecurityDeposit""     numeric,
    ""DriverFee""           numeric,
    ""IncludesDriver""      boolean NOT NULL DEFAULT false,
    ""IncludesInsurance""   boolean NOT NULL DEFAULT false,
    ""OfferMessage""        text NOT NULL DEFAULT '',
    ""TermsAndConditions""  text NOT NULL DEFAULT '',
    ""SubmittedAt""         timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""ResponsedAt""         timestamp with time zone,
    CONSTRAINT ""PK_RentalOffers"" PRIMARY KEY (""Id"")
);");

            // ── VehicleRentalRequests table ────────────────────────────────────
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""VehicleRentalRequests"" (
    ""Id""                  uuid NOT NULL DEFAULT gen_random_uuid(),
    ""UserId""              uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""TenantId""            uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""VehicleType""         text NOT NULL DEFAULT '',
    ""TripPurpose""         text NOT NULL DEFAULT '',
    ""PickupLocation""      text NOT NULL DEFAULT '',
    ""DropoffLocation""     text NOT NULL DEFAULT '',
    ""StartDate""           timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""EndDate""             timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""DurationDays""        integer NOT NULL DEFAULT 1,
    ""SeatingCapacity""     integer,
    ""BudgetMin""           numeric,
    ""BudgetMax""           numeric,
    ""SpecialRequirements"" text NOT NULL DEFAULT '',
    ""Status""              text NOT NULL DEFAULT '',
    ""AcceptedOfferId""     uuid,
    ""CreatedAt""           timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""ClosedAt""            timestamp with time zone,
    CONSTRAINT ""PK_VehicleRentalRequests"" PRIMARY KEY (""Id"")
);");

            // ── VehicleRentalBookings table ────────────────────────────────────
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""VehicleRentalBookings"" (
    ""Id""                   uuid NOT NULL DEFAULT gen_random_uuid(),
    ""RentalRequestId""      uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""RentalOfferId""        uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""RenterId""             uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""OwnerId""              uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""VehicleId""            uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""Status""               text NOT NULL DEFAULT '',
    ""PickupLocation""       text NOT NULL DEFAULT '',
    ""DropoffLocation""      text NOT NULL DEFAULT '',
    ""StartDate""            timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""EndDate""              timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""DurationDays""         integer NOT NULL DEFAULT 1,
    ""TotalAmount""          numeric NOT NULL DEFAULT 0,
    ""BookedAt""             timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""StartedAt""            timestamp with time zone,
    ""CompletedAt""          timestamp with time zone,
    ""CancelledAt""          timestamp with time zone,
    ""CancellationReason""   text,
    CONSTRAINT ""PK_VehicleRentalBookings"" PRIMARY KEY (""Id"")
);");

            // ── DailyTaxiQueue table ───────────────────────────────────────────
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""DailyTaxiQueue"" (
    ""Id""              uuid NOT NULL DEFAULT gen_random_uuid(),
    ""TaxiRankId""      uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""TenantId""        uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""VehicleId""       uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ""DriverId""        uuid,
    ""QueueDate""       timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""AvailableFrom""   interval NOT NULL DEFAULT '0',
    ""AvailableUntil""  interval,
    ""Priority""        integer NOT NULL DEFAULT 0,
    ""Status""          text NOT NULL DEFAULT '',
    ""Notes""           text,
    ""AssignedTripId""  uuid,
    ""AssignedAt""      timestamp with time zone,
    ""AssignedByUserId"" uuid,
    ""CreatedAt""       timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""UpdatedAt""       timestamp with time zone,
    CONSTRAINT ""PK_DailyTaxiQueue"" PRIMARY KEY (""Id"")
);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""Messages"";");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""Tenders"";");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""TenderApplications"";");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""RoadsideAssistanceRequests"";");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""TrackingDeviceRequests"";");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""TrackingDeviceOffers"";");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""RentalOffers"";");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""DailyTaxiQueue"";");
            migrationBuilder.Sql(@"ALTER TABLE ""MechanicalRequests"" DROP COLUMN IF EXISTS ""ServiceProviderRating"";");
        }
    }
}
