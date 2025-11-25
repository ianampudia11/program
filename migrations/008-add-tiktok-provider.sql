-- Add TikTok Provider to Partner Configurations
-- This migration adds 'tiktok' as a valid provider in the partner_configurations table

DO $$
BEGIN
  -- Check if the constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'partner_configurations_provider_check' 
    AND table_name = 'partner_configurations'
  ) THEN
    RAISE NOTICE 'Dropping existing provider check constraint...';
    ALTER TABLE partner_configurations DROP CONSTRAINT partner_configurations_provider_check;
  END IF;

  -- Add new constraint with TikTok included
  RAISE NOTICE 'Adding new provider check constraint with TikTok...';
  ALTER TABLE partner_configurations 
    ADD CONSTRAINT partner_configurations_provider_check 
    CHECK (provider IN ('360dialog', 'meta', 'twilio', 'tiktok'));

  RAISE NOTICE 'TikTok provider added successfully';
END$$;

-- Update comment to reflect new provider
COMMENT ON COLUMN partner_configurations.provider IS 'Partner provider name (360dialog, meta, twilio, tiktok)';

-- Rollback instructions (for manual rollback if needed)
-- To rollback this migration, run:
-- ALTER TABLE partner_configurations DROP CONSTRAINT partner_configurations_provider_check;
-- ALTER TABLE partner_configurations ADD CONSTRAINT partner_configurations_provider_check CHECK (provider IN ('360dialog', 'meta', 'twilio'));

