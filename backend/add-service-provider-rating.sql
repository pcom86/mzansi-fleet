-- Add ServiceProviderRating column to MaintenanceHistories table
-- This column stores a rating (1-5 stars) for the service provider who performed the maintenance

DO $$ 
BEGIN
    -- Check if the column already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'MaintenanceHistories' 
        AND column_name = 'ServiceProviderRating'
    ) THEN
        -- Add the ServiceProviderRating column
        ALTER TABLE "MaintenanceHistories" 
        ADD COLUMN "ServiceProviderRating" INTEGER NULL;
        
        RAISE NOTICE 'ServiceProviderRating column added successfully to MaintenanceHistories table';
    ELSE
        RAISE NOTICE 'ServiceProviderRating column already exists in MaintenanceHistories table';
    END IF;
END $$;
