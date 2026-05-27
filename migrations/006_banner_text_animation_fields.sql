ALTER TABLE banners_promocionais
ADD COLUMN IF NOT EXISTS animacao_texto_tipo text NOT NULL DEFAULT 'entrance',
ADD COLUMN IF NOT EXISTS intensidade_animacao_texto numeric NOT NULL DEFAULT 1;
