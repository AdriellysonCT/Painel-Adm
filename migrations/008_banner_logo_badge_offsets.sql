ALTER TABLE banners_promocionais
ADD COLUMN IF NOT EXISTS logo_offset_x numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS logo_offset_y numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS badge_offset_x numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS badge_offset_y numeric NOT NULL DEFAULT 0;
