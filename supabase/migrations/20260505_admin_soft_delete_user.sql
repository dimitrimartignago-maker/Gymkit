-- =============================================================
-- GymKit — Soft delete utente da pannello admin
-- Eseguire nel SQL Editor di Supabase (Project → SQL Editor)
-- =============================================================

-- Funzione per cancellazione soft delete utente da admin
CREATE OR REPLACE FUNCTION admin_soft_delete_user(target_id UUID, admin_id UUID)
RETURNS VOID AS $$
DECLARE
    admin_role TEXT;
    admin_gym_id UUID;
    target_role TEXT;
    target_gym_id UUID;
BEGIN
    -- Verifica che chi chiama esista e ottieni ruolo + gym_id
    SELECT role, gym_id INTO admin_role, admin_gym_id
    FROM profiles
    WHERE id = admin_id;
    
    IF admin_role IS NULL THEN
        RAISE EXCEPTION 'Admin non trovato.';
    END IF;
    
    -- Verifica che chi chiama sia effettivamente admin
    IF admin_role != 'admin' THEN
        RAISE EXCEPTION 'Solo gli admin possono cancellare utenti.';
    END IF;
    
    -- Verifica che il target esista e ottieni il suo gym_id e role
    SELECT role, gym_id INTO target_role, target_gym_id
    FROM profiles
    WHERE id = target_id;
    
    IF target_gym_id IS NULL THEN
        RAISE EXCEPTION 'Utente target non trovato.';
    END IF;
    
    -- Verifica che target appartenga alla stessa palestra dell'admin
    IF target_gym_id != admin_gym_id THEN
        RAISE EXCEPTION 'L''utente target non appartiene alla tua palestra.';
    END IF;
    
    -- Non si possono cancellare altri admin
    IF target_role = 'admin' THEN
        RAISE EXCEPTION 'Non puoi cancellare un altro admin.';
    END IF;
    
    -- Soft delete del profilo
    UPDATE profiles
    SET is_active = false
    WHERE id = target_id;
    
    -- Disattiva le relazioni trainer-client con questo utente
    UPDATE trainer_clients
    SET is_active = false
    WHERE client_id = target_id OR trainer_id = target_id;
    
    -- Annulla le prenotazioni future del cliente
    UPDATE bookings
    SET status = 'cancelled', cancelled_at = NOW()
    WHERE client_id = target_id
      AND status IN ('confirmed', 'waitlist')
      AND class_slot_id IN (
          SELECT id FROM class_slots WHERE starts_at > NOW()
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aggiornamento della function current_user_role() con filtro is_active
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM profiles WHERE id = auth.uid() AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Aggiornamento della function current_user_gym_id() con filtro is_active
CREATE OR REPLACE FUNCTION current_user_gym_id()
RETURNS UUID AS $$
    SELECT gym_id FROM profiles WHERE id = auth.uid() AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;