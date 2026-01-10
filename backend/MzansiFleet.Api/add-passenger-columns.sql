DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Passengers' AND column_name='NextOfKin') THEN
        ALTER TABLE \"Passengers\" ADD COLUMN \"NextOfKin\" TEXT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Passengers' AND column_name='NextOfKinContact') THEN
        ALTER TABLE \"Passengers\" ADD COLUMN \"NextOfKinContact\" TEXT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Passengers' AND column_name='Address') THEN
        ALTER TABLE \"Passengers\" ADD COLUMN \"Address\" TEXT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Passengers' AND column_name='Destination') THEN
        ALTER TABLE \"Passengers\" ADD COLUMN \"Destination\" TEXT NULL;
    END IF;
END $$;