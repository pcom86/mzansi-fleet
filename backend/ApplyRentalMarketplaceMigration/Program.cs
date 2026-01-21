using System;
using System.Threading.Tasks;
using Npgsql;

class Program
{
    static async Task Main(string[] args)
    {
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
    ""MinCapacity"" INT NOT NULL,
    ""StartDate"" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    ""EndDate"" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    ""PickupLocation"" TEXT NOT NULL,
    ""DropoffLocation"" TEXT NOT NULL,
    ""Budget"" DECIMAL(18,2) NOT NULL,
    ""AdditionalRequirements"" TEXT NULL,
    ""Status"" TEXT NOT NULL DEFAULT 'Open',
    ""AcceptedOfferId"" UUID NULL,
    ""CreatedAt"" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    ""UpdatedAt"" TIMESTAMP WITHOUT TIME ZONE NULL,
    CONSTRAINT ""FK_VehicleRentalRequests_Users"" FOREIGN KEY (""UserId"") REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_VehicleRentalRequests_Tenants"" FOREIGN KEY (""TenantId"") REFERENCES ""Tenants""(""Id"") ON DELETE CASCADE
);

-- Table 2: Rental Offers (Owners responding to rental requests)
CREATE TABLE IF NOT EXISTS ""RentalOffers"" (
    ""Id"" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ""RequestId"" UUID NOT NULL,
    ""OwnerId"" UUID NOT NULL,
    ""VehicleId"" UUID NOT NULL,
    ""OfferPrice"" DECIMAL(18,2) NOT NULL,
    ""Message"" TEXT NULL,
    ""Status"" TEXT NOT NULL DEFAULT 'Pending',
    ""CreatedAt"" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT ""FK_RentalOffers_VehicleRentalRequests"" FOREIGN KEY (""RequestId"") REFERENCES ""VehicleRentalRequests""(""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_RentalOffers_OwnerProfiles"" FOREIGN KEY (""OwnerId"") REFERENCES ""OwnerProfiles""(""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_RentalOffers_Vehicles"" FOREIGN KEY (""VehicleId"") REFERENCES ""Vehicles""(""Id"") ON DELETE CASCADE
);

-- Table 3: Vehicle Rental Bookings (Accepted rental agreements)
CREATE TABLE IF NOT EXISTS ""VehicleRentalBookings"" (
    ""Id"" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ""RequestId"" UUID NOT NULL,
    ""OfferId"" UUID NOT NULL,
    ""UserId"" UUID NOT NULL,
    ""OwnerId"" UUID NOT NULL,
    ""VehicleId"" UUID NOT NULL,
    ""StartDate"" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    ""EndDate"" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    ""TotalPrice"" DECIMAL(18,2) NOT NULL,
    ""Status"" TEXT NOT NULL DEFAULT 'Active',
    ""CreatedAt"" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    ""CompletedAt"" TIMESTAMP WITHOUT TIME ZONE NULL,
    CONSTRAINT ""FK_VehicleRentalBookings_VehicleRentalRequests"" FOREIGN KEY (""RequestId"") REFERENCES ""VehicleRentalRequests""(""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_VehicleRentalBookings_RentalOffers"" FOREIGN KEY (""OfferId"") REFERENCES ""RentalOffers""(""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_VehicleRentalBookings_Users"" FOREIGN KEY (""UserId"") REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_VehicleRentalBookings_OwnerProfiles"" FOREIGN KEY (""OwnerId"") REFERENCES ""OwnerProfiles""(""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_VehicleRentalBookings_Vehicles"" FOREIGN KEY (""VehicleId"") REFERENCES ""Vehicles""(""Id"") ON DELETE CASCADE
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS ""IX_VehicleRentalRequests_UserId"" ON ""VehicleRentalRequests""(""UserId"");
CREATE INDEX IF NOT EXISTS ""IX_VehicleRentalRequests_Status"" ON ""VehicleRentalRequests""(""Status"");
CREATE INDEX IF NOT EXISTS ""IX_VehicleRentalRequests_StartDate"" ON ""VehicleRentalRequests""(""StartDate"");

CREATE INDEX IF NOT EXISTS ""IX_RentalOffers_RequestId"" ON ""RentalOffers""(""RequestId"");
CREATE INDEX IF NOT EXISTS ""IX_RentalOffers_OwnerId"" ON ""RentalOffers""(""OwnerId"");
CREATE INDEX IF NOT EXISTS ""IX_RentalOffers_VehicleId"" ON ""RentalOffers""(""VehicleId"");
CREATE INDEX IF NOT EXISTS ""IX_RentalOffers_Status"" ON ""RentalOffers""(""Status"");

CREATE INDEX IF NOT EXISTS ""IX_VehicleRentalBookings_UserId"" ON ""VehicleRentalBookings""(""UserId"");
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
    }
}
