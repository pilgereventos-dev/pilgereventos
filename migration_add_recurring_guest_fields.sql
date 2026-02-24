-- Adiciona a coluna event_name para identificar de qual evento o convidado veio
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS event_name TEXT DEFAULT 'carnaval';

-- Adiciona a coluna is_recurring para saber se é um cliente recorrente
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;

-- Opcional: indexar event_name e is_recurring para acelerar as buscas no admin
CREATE INDEX IF NOT EXISTS idx_guests_event_name ON guests (event_name);
CREATE INDEX IF NOT EXISTS idx_guests_is_recurring ON guests (is_recurring);
