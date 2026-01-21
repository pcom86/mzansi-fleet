#!/usr/bin/env dotnet-script
#r "nuget: Npgsql, 8.0.1"

using Npgsql;

var connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres";

Console.WriteLine("📦 Applying Vehicle Rental Marketplace Migration...");

using var connection = new NpgsqlConnection(connectionString);
await connection.OpenAsync();
Console.WriteLine("✓ Connected to database");

var sql = @"
-- =============================================
-- Vehicle Rental Marketplace Tables
-- =============================================

-- Table 1: Vehicle Rental Requests (Users requesting to rent vehicles)
CREATE TABLE IF NOT EXISTS ""VehicleRentalRequests"" (
    ""Id"" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ""UserId"" UUID NOT NULL,
    ""TenantId"" UUID NOT NULL,
    ""VehicleType"" TEXT NOT NULL,
    ""SeatingCapacity"" INT NULL,
    ""PickupLocation"" TEXT NOT NULL,
    ""DropoffLocation"" TEXT NOT NULL,
    ""StartDate"" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    ""EndDate"" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    ""DurationDays"" INT NOT NULL,
    ""TripPurpose"" TEXT NOT NULL,
    ""SpecialRequirements"" TEXT NULL,
    ""BudgetMin"" DECIMAL(18,2) NULL,
    ""BudgetMax"" DECIMAL(18,2) NULL,
    ""Status"" TEXT NOT NULL DEFAULT 'Open',
    ""CreatedAt"" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    ""ClosedAt"" TIMESTAMP WITHOUT TIME ZONE NULL,
    ""AcceptedOfferId"" UUID NULL,
    CONSTRAINT ""FK_VehicleRentalRequests_Users"" FOREIGN KEY (""UserId"") REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_VehicleRentalRequests_Tenants"" FOREIGN KEY (""TenantId"") REFERENCES ""Tenants""(""Id"") ON DELETE CASCADE
);

-- Table 2: Rental Offers (Owners responding to rental requests)
CREATE TABLE IF NOT EXISTS ""RentalOffers"" (
    ""Id"" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ""RentalRequestId"" UUID NOT NULL,
    ""OwnerId"" UUID NOT NULL,
    ""VehicleId"" UUID NOT NULL,
    ""PricePerDay"" DECIMAL(18,2) NOT NULL,
    ""TotalPrice"" DECIMAL(18,2) NOT NULL,
    ""OfferMessage"" TEXT NOT NULL,
    ""TermsAndConditions"" TEXT NULL,
    ""IncludesDriver"" BOOLEAN NOT NULL DEFAULT FALSE,
    ""DriverFee"" DECIMAL(18,2) NULL,
    ""IncludesInsurance"" BOOLEAN NOT NULL DEFAULT FALSE,
    ""SecurityDeposit"" DECIMAL(18,2) NULL,
    ""Status"" TEXT NOT NULL DEFAULT 'Pending',
    ""SubmittedAt"" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    ""ResponsedAt"" TIMESTAMP WITHOUT TIME ZONE NULL,
    CONSTRAINT ""FK_RentalOffers_VehicleRentalRequests"" FOREIGN KEY (""RentalRequestId"") REFERENCES ""VehicleRentalRequests""(""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_RentalOffers_OwnerProfiles"" FOREIGN KEY (""OwnerId"") REFERENCES ""OwnerProfiles""(""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_RentalOffers_Vehicles"" FOREIGN KEY (""VehicleId"") REFERENCES ""Vehicles""(""Id"") ON DELETE CASCADE
);

-- Table 3: Vehicle Rental Bookings (Accepted rental agreements)
CREATE TABLE IF NOT EXISTS ""VehicleRentalBookings"" (
    ""Id"" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ""RentalRequestId"" UUID NOT NULL,
    ""RentalOfferId"" UUID NOT NULL,
    ""RenterId"" UUID NOT NULL,
    ""OwnerId"" UUID NOT NULL,
    ""VehicleId"" UUID NOT NULL,
    ""StartDate"" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    ""EndDate"" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    ""DurationDays"" INT NOT NULL,
    ""TotalAmount"" DECIMAL(18,2) NOT NULL,
    ""PickupLocation"" TEXT NOT NULL,
    ""DropoffLocation"" TEXT NOT NULL,
    ""Status"" TEXT NOT NULL DEFAULT 'Confirmed',
    ""BookedAt"" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    ""StartedAt"" TIMESTAMP WITHOUT TIME ZONE NULL,
    ""CompletedAt"" TIMESTAMP WITHOUT TIME ZONE NULL,
    ""CancellationReason"" TEXT NULL,
    ""CancelledAt"" TIMESTAMP WITHOUT TIME ZONE NULL,
    CONSTRAINT ""FK_VehicleRentalBookings_VehicleRentalRequests"" FOREIGN KEY (""RentalRequestId"") REFERENCES ""VehicleRentalRequests""(""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_VehicleRentalBookings_RentalOffers"" FOREIGN KEY (""RentalOfferId"") REFERENCES ""RentalOffers""(""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_VehicleRentalBookings_Users"" FOREIGN KEY (""RenterId"") REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_VehicleRentalBookings_OwnerProfiles"" FOREIGN KEY (""OwnerId"") REFERENCES ""OwnerProfiles""(""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_VehicleRentalBookings_Vehicles"" FOREIGN KEY (""VehicleId"") REFERENCES ""Vehicles""(""Id"") ON DELETE CASCADE
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS ""IX_VehicleRentalRequests_UserId"" ON ""VehicleRentalRequests""(""UserId"");
CREATE INDEX IF NOT EXISTS ""IX_VehicleRentalRequests_Status"" ON ""VehicleRentalRequests""(""Status"");
CREATE INDEX IF NOT EXISTS ""IX_VehicleRentalRequests_StartDate"" ON ""VehicleRentalRequests""(""StartDate"");

CREATE INDEX IF NOT EXISTS ""IX_RentalOffers_RentalRequestId"" ON ""RentalOffers""(""RentalRequestId"");
CREATE INDEX IF NOT EXISTS ""IX_RentalOffers_OwnerId"" ON ""RentalOffers""(""OwnerId"");
CREATE INDEX IF NOT EXISTS ""IX_RentalOffers_VehicleId"" ON ""RentalOffers""(""VehicleId"");
CREATE INDEX IF NOT EXISTS ""IX_RentalOffers_Status"" ON ""RentalOffers""(""Status"");

CREATE INDEX IF NOT EXISTS ""IX_VehicleRentalBookings_RenterId"" ON ""VehicleRentalBookings""(""RenterId"");
CREATE INDEX IF NOT EXISTS ""IX_VehicleRentalBookings_OwnerId"" ON ""VehicleRentalBookings""(""OwnerId"");
CREATE INDEX IF NOT EXISTS ""IX_VehicleRentalBookings_VehicleId"" ON ""VehicleRentalBookings""(""VehicleId"");
CREATE INDEX IF NOT EXISTS ""IX_VehicleRentalBookings_Status"" ON ""VehicleRentalBookings""(""Status"");
";

using var command = new NpgsqlCommand(sql, connection);
await command.ExecuteNonQueryAsync();

Console.WriteLine("✓ Vehicle Rental Marketplace tables created successfully!");
Console.WriteLine("  - VehicleRentalRequests");
Console.WriteLine("  - RentalOffers");
Console.WriteLine("  - VehicleRentalBookings");
Console.WriteLine("✓ Indexes created");
Console.WriteLine();
Console.WriteLine("✅ Migration completed successfully!");
