ALTER TABLE banners_promocionais
ADD COLUMN IF NOT EXISTS layout_type text NOT NULL DEFAULT 'text-left',
ADD COLUMN IF NOT EXISTS font_preset text NOT NULL DEFAULT 'impact',
ADD COLUMN IF NOT EXISTS badge_text text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS badge_position text DEFAULT NULL;
