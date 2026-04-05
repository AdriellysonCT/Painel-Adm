-- Adiciona posicionamento e escala para a arte livre dos banners.
ALTER TABLE public.banners_promocionais
    ADD COLUMN IF NOT EXISTS media_scale double precision NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS media_offset_x double precision NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS media_offset_y double precision NOT NULL DEFAULT 0;

UPDATE public.banners_promocionais
SET
    media_scale = COALESCE(media_scale, 1),
    media_offset_x = COALESCE(media_offset_x, 0),
    media_offset_y = COALESCE(media_offset_y, 0)
WHERE media_scale IS NULL
   OR media_offset_x IS NULL
   OR media_offset_y IS NULL;
