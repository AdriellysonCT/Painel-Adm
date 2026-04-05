-- Extende banners_promocionais para suportar mídia personalizada e animações.
ALTER TABLE public.banners_promocionais
    ADD COLUMN IF NOT EXISTS tipo_midia text NOT NULL DEFAULT 'emoji',
    ADD COLUMN IF NOT EXISTS imagem_url text,
    ADD COLUMN IF NOT EXISTS animacao_texto text NOT NULL DEFAULT 'slide-up',
    ADD COLUMN IF NOT EXISTS animacao_midia text NOT NULL DEFAULT 'float';

UPDATE public.banners_promocionais
SET
    tipo_midia = COALESCE(tipo_midia, 'emoji'),
    animacao_texto = COALESCE(animacao_texto, 'slide-up'),
    animacao_midia = COALESCE(animacao_midia, 'float')
WHERE tipo_midia IS NULL
   OR animacao_texto IS NULL
   OR animacao_midia IS NULL;
