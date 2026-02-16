-- Add UserId column to TripPassengers table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'TripPassengers'
        AND column_name = 'UserId'
    ) THEN
        ALTER TABLE "TripPassengers"
        ADD COLUMN "UserId" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

        -- Add foreign key constraint to Users table
        ALTER TABLE "TripPassengers"
        ADD CONSTRAINT "FK_TripPassengers_Users_UserId"
        FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE;

        -- Add index for performance
        CREATE INDEX "IX_TripPassengers_UserId" ON "TripPassengers" ("UserId");

        RAISE NOTICE 'UserId column added to TripPassengers';
    ELSE
        RAISE NOTICE 'UserId column already exists in TripPassengers';
    END IF;
END $$;