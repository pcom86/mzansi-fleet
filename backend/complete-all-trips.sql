-- SQL Script to mark all active trips as completed
-- This will update both TaxiRankTrips and TripRequests tables

-- Update all TaxiRankTrips with status 'Departed', 'InTransit', or 'Arrived' to 'Completed'
UPDATE "TaxiRankTrips"
SET 
    "Status" = 'Completed',
    "CompletedAt" = NOW(),
    "UpdatedAt" = NOW(),
    "Notes" = COALESCE("Notes", '') || ' [Auto-completed via script]'
WHERE "Status" IN ('Departed', 'InTransit', 'Arrived', 'Loading', 'Active', 'Pending');

-- Update all TripRequests with state 'InProgress' to 'Completed'
UPDATE "TripRequests"
SET 
    "State" = 'Completed',
    "CompletedAt" = NOW()
WHERE "State" = 'InProgress';

-- Show how many rows were affected
-- In PostgreSQL, you can check with: GET DIAGNOSTICS affected_row_count = ROW_COUNT;

-- To verify the update, you can run:
-- SELECT "Id", "State", "CompletedAt" FROM "TripRequests" WHERE "State" = 'Completed' ORDER BY "CompletedAt" DESC;
-- SELECT "Id", "Status", "CompletedAt" FROM "TaxiRankTrips" WHERE "Status" = 'Completed' ORDER BY "CompletedAt" DESC;
