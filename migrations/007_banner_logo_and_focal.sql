ALTER TABLE banners_promocionais
ADD COLUMN IF NOT EXISTS logo_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS logo_position text NOT NULL DEFAULT 'top-left',
ADD COLUMN IF NOT EXISTS media_focal_x numeric NOT NULL DEFAULT 50,
ADD COLUMN IF NOT EXISTS media_focal_y numeric NOT NULL DEFAULT 50;
