-- Create Roadside Assistance Request table
CREATE TABLE IF NOT EXISTS "RoadsideAssistanceRequests" (
    "Id" UUID PRIMARY KEY,
    "UserId" UUID NOT NULL,
    "UserName" VARCHAR(255) NOT NULL,
    "UserPhone" VARCHAR(50) NOT NULL,
    "UserRole" VARCHAR(50) NOT NULL,
    
    "VehicleId" UUID,
    "VehicleRegistration" VARCHAR(50),
    "VehicleMake" VARCHAR(100),
    "VehicleModel" VARCHAR(100),
    
    "AssistanceType" VARCHAR(100) NOT NULL,
    "Location" TEXT NOT NULL,
    "Latitude" VARCHAR(50),
    "Longitude" VARCHAR(50),
    "IssueDescription" TEXT NOT NULL,
    "AdditionalNotes" TEXT,
    
    "Status" VARCHAR(50) NOT NULL DEFAULT 'Pending',
    "RequestedAt" TIMESTAMP NOT NULL,
    "AssignedAt" TIMESTAMP,
    "CompletedAt" TIMESTAMP,
    
    "ServiceProviderId" UUID,
    "ServiceProviderName" VARCHAR(255),
    "ServiceProviderPhone" VARCHAR(50),
    "TechnicianName" VARCHAR(255),
    "EstimatedArrivalTime" VARCHAR(100),
    
    "EstimatedCost" DECIMAL(18,2),
    "ActualCost" DECIMAL(18,2),
    
    "Priority" VARCHAR(50) NOT NULL DEFAULT 'Normal',
    
    CONSTRAINT "FK_RoadsideAssistance_Vehicle" FOREIGN KEY ("VehicleId") REFERENCES "Vehicles"("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_RoadsideAssistance_ServiceProvider" FOREIGN KEY ("ServiceProviderId") REFERENCES "ServiceProviderProfiles"("Id") ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "IX_RoadsideAssistance_UserId" ON "RoadsideAssistanceRequests"("UserId");
CREATE INDEX IF NOT EXISTS "IX_RoadsideAssistance_VehicleId" ON "RoadsideAssistanceRequests"("VehicleId");
CREATE INDEX IF NOT EXISTS "IX_RoadsideAssistance_ServiceProviderId" ON "RoadsideAssistanceRequests"("ServiceProviderId");
CREATE INDEX IF NOT EXISTS "IX_RoadsideAssistance_Status" ON "RoadsideAssistanceRequests"("Status");
CREATE INDEX IF NOT EXISTS "IX_RoadsideAssistance_RequestedAt" ON "RoadsideAssistanceRequests"("RequestedAt");
CREATE INDEX IF NOT EXISTS "IX_RoadsideAssistance_Priority" ON "RoadsideAssistanceRequests"("Priority");

-- Success message
SELECT 'Roadside Assistance table created successfully' AS message;
