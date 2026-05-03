-- Migration: extend_tort_images_for_pi
-- Purpose: Add practice_area and pi_category tagging to existing image library
-- Note: The actual table name is `tort_images` (the placeholder migration was
--       named `add_tort_images_v2` but the table itself is `tort_images`).

-- Add practice_area discriminator (defaults to mass_tort to preserve existing rows)
ALTER TABLE tort_images
  ADD COLUMN IF NOT EXISTS practice_area TEXT NOT NULL DEFAULT 'mass_tort';

-- Soft constraint via CHECK (if not already enforced)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tort_images_practice_area_check'
  ) THEN
    ALTER TABLE tort_images
      ADD CONSTRAINT tort_images_practice_area_check
      CHECK (practice_area IN ('mass_tort', 'personal_injury'));
  END IF;
END $$;

-- Add pi_category column (NULL for mass tort images, enum value for PI)
ALTER TABLE tort_images
  ADD COLUMN IF NOT EXISTS pi_category TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tort_images_pi_category_check'
  ) THEN
    ALTER TABLE tort_images
      ADD CONSTRAINT tort_images_pi_category_check
      CHECK (
        pi_category IS NULL OR pi_category IN (
          'car_accident',
          'truck_accident',
          'motorcycle_accident',
          'boating_accident',
          'slip_and_fall',
          'dog_bite',
          'premises_liability',
          'pedestrian_accident',
          'bicycle_accident'
        )
      );
  END IF;
END $$;

-- Index for filter queries (practice_area + pi_category)
CREATE INDEX IF NOT EXISTS idx_tort_images_practice_area
  ON tort_images (practice_area);

CREATE INDEX IF NOT EXISTS idx_tort_images_pi_category
  ON tort_images (pi_category) WHERE pi_category IS NOT NULL;

COMMENT ON COLUMN tort_images.practice_area IS
  'mass_tort or personal_injury. Existing rows default to mass_tort.';
COMMENT ON COLUMN tort_images.pi_category IS
  'PI category enum value. NULL for mass tort images.';
