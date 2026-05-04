-- Migration: relax_tort_images_fk_for_pi
-- Purpose: Allow PI images to be uploaded without satisfying the
--          tort_slug → mass_torts FK.
--
-- Problem:
--   tort_images.tort_slug has a hard FK to mass_torts(slug). The PI
--   admin upload route writes the pi_category value (e.g. "car_accident")
--   into tort_slug to satisfy the NOT NULL constraint, but those
--   strings aren't rows in mass_torts — so the insert fails with
--   "violates foreign key constraint tort_images_tort_slug_fkey".
--
-- Fix:
--   Drop the FK and replace with a partial CHECK that only enforces
--   the relationship when practice_area = 'mass_tort'. PI images
--   ride free.
--
-- Rollback: re-add the FK (will fail if any PI images exist with
-- tort_slug values not in mass_torts.slug, which is by design).

ALTER TABLE public.tort_images
  DROP CONSTRAINT IF EXISTS tort_images_tort_slug_fkey;

-- We could add a partial-FK via a trigger, but PostgreSQL doesn't
-- support partial FKs natively. The simplest enforcement: a deferred
-- check via a CHECK constraint that only requires tort_slug to match
-- a real tort row when practice_area = 'mass_tort'. Implemented as a
-- trigger so the cross-table reference works.

CREATE OR REPLACE FUNCTION public.tort_images_validate_mass_tort_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.practice_area = 'mass_tort' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mass_torts mt WHERE mt.slug = NEW.tort_slug
    ) THEN
      RAISE EXCEPTION
        'tort_images.tort_slug = % does not exist in mass_torts.slug (required when practice_area=mass_tort)',
        NEW.tort_slug;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tort_images_validate_mass_tort_slug ON public.tort_images;
CREATE TRIGGER trg_tort_images_validate_mass_tort_slug
  BEFORE INSERT OR UPDATE ON public.tort_images
  FOR EACH ROW
  EXECUTE FUNCTION public.tort_images_validate_mass_tort_slug();

COMMENT ON FUNCTION public.tort_images_validate_mass_tort_slug() IS
  'Enforces tort_slug → mass_torts.slug only when practice_area=mass_tort. PI images skip the check (their tort_slug holds a pi_category value).';
