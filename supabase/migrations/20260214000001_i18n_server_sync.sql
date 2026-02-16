-- i18n Server Synchronization Schema
-- Phase 30-01: Language preference storage and notification translation templates
-- Enables cross-device language sync and localized push notifications

-- ============================================
-- ADD PREFERRED_LANGUAGE TO USERS TABLE
-- ============================================

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en'
CHECK (preferred_language IN ('en', 'es'));

-- ============================================
-- UPDATE USER_PROFILES VIEW
-- Must DROP and CREATE due to column reordering
-- ============================================

DROP VIEW IF EXISTS public.user_profiles;

CREATE VIEW public.user_profiles AS
SELECT
  id,
  email,
  full_name AS display_name,
  avatar_url,
  birthday,
  preferred_language,
  onboarding_completed,
  created_at,
  updated_at
FROM public.users;

-- ============================================
-- UPDATE USER_PROFILES TRIGGER FUNCTIONS
-- ============================================

-- Update the INSERT trigger to handle preferred_language
CREATE OR REPLACE FUNCTION public.user_profiles_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, birthday, preferred_language, onboarding_completed, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.display_name,
    NEW.avatar_url,
    NEW.birthday,
    COALESCE(NEW.preferred_language, 'en'),
    COALESCE(NEW.onboarding_completed, FALSE),
    COALESCE(NEW.created_at, NOW()),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the UPDATE trigger to handle preferred_language
CREATE OR REPLACE FUNCTION public.user_profiles_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET
    full_name = COALESCE(NEW.display_name, full_name),
    avatar_url = NEW.avatar_url,
    birthday = COALESCE(NEW.birthday, birthday),
    preferred_language = COALESCE(NEW.preferred_language, preferred_language),
    onboarding_completed = COALESCE(NEW.onboarding_completed, onboarding_completed),
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CREATE NOTIFICATION_TRANSLATIONS TABLE
-- ============================================

CREATE TABLE public.notification_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  language_code TEXT NOT NULL CHECK (language_code IN ('en', 'es')),
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notification_type, language_code)
);

-- Enable RLS (Edge Functions use service role key, bypasses RLS)
ALTER TABLE public.notification_translations ENABLE ROW LEVEL SECURITY;

-- Read-only policy for authenticated users (for debugging/admin)
CREATE POLICY "Authenticated users can read translations"
  ON public.notification_translations
  FOR SELECT
  TO authenticated
  USING (true);

-- Index for fast lookup by notification type and language
CREATE INDEX idx_notification_translations_lookup
  ON public.notification_translations(notification_type, language_code);

-- ============================================
-- SEED NOTIFICATION TRANSLATIONS
-- ============================================

INSERT INTO public.notification_translations (notification_type, language_code, title_template, body_template) VALUES
-- Friend Request Received
('friend_request_received', 'en', 'New Friend Request', '{{sender_name}} sent you a friend request'),
('friend_request_received', 'es', 'Nueva solicitud de amistad', '{{sender_name}} te envió una solicitud de amistad'),

-- Friend Request Accepted
('friend_request_accepted', 'en', 'Friend Request Accepted!', '{{accepter_name}} accepted your friend request. You are now friends!'),
('friend_request_accepted', 'es', '¡Solicitud de amistad aceptada!', '{{accepter_name}} aceptó tu solicitud de amistad. ¡Ya son amigos!'),

-- Birthday Day Of
('birthday_day_of', 'en', 'Happy Birthday!', 'Happy birthday, {{celebrant_name}}! 🎉'),
('birthday_day_of', 'es', '¡Feliz cumpleaños!', '¡Feliz cumpleaños, {{celebrant_name}}! 🎉'),

-- Gift Leader Week Reminder
('gift_leader_week_reminder', 'en', '1 Week Left!', 'You have 1 week to collect contributions for {{celebrant_name}}''s birthday'),
('gift_leader_week_reminder', 'es', '¡Queda 1 semana!', 'Tienes 1 semana para recolectar contribuciones para el cumpleaños de {{celebrant_name}}'),

-- Birthday Reminder
('birthday_reminder', 'en', 'Upcoming Birthday', '{{celebrant_name}}''s birthday is in {{days}} days!'),
('birthday_reminder', 'es', 'Próximo cumpleaños', '¡El cumpleaños de {{celebrant_name}} es en {{days}} días!'),

-- Contribution Reminder
('contribution_reminder', 'en', 'Contribution Reminder', 'Don''t forget to contribute to upcoming birthday gifts'),
('contribution_reminder', 'es', 'Recordatorio de contribución', 'No olvides contribuir a los regalos de cumpleaños próximos'),

-- Item Claimed
('item_claimed', 'en', 'Item Claimed', '{{item_name}} has been claimed for {{amount}}'),
('item_claimed', 'es', 'Artículo reclamado', '{{item_name}} ha sido reclamado por {{amount}}'),

-- Split Invite
('split_invite', 'en', 'Split Invite', 'You''ve been invited to contribute {{amount}} to {{item_name}}'),
('split_invite', 'es', 'Invitación a dividir', 'Te invitaron a contribuir {{amount}} para {{item_name}}'),

-- Split Fully Funded
('split_fully_funded', 'en', 'Split Fully Funded!', '{{item_name}} is now fully funded. Thank you!'),
('split_fully_funded', 'es', '¡División completamente financiada!', '{{item_name}} ya está completamente financiado. ¡Gracias!'),

-- Split Canceled
('split_canceled', 'en', 'Split Canceled', 'The split for {{item_name}} has been canceled'),
('split_canceled', 'es', 'División cancelada', 'La división para {{item_name}} ha sido cancelada'),

-- Gift Leader Assigned
('gift_leader_assigned', 'en', 'You''re the Gift Leader!', 'You''ve been assigned as gift leader for {{celebrant_name}}''s birthday'),
('gift_leader_assigned', 'es', '¡Eres el líder de regalo!', 'Has sido asignado como líder de regalo para el cumpleaños de {{celebrant_name}}'),

-- Gift Leader Reassigned
('gift_leader_reassigned', 'en', 'Gift Leader Reassigned', '{{leader_name}} is now the gift leader for {{celebrant_name}}''s birthday'),
('gift_leader_reassigned', 'es', 'Líder de regalo reasignado', '{{leader_name}} es ahora el líder de regalo para el cumpleaños de {{celebrant_name}}');

-- ============================================
-- COMPLETED
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'i18n server sync schema created successfully!';
  RAISE NOTICE 'Added: users.preferred_language column with en/es constraint';
  RAISE NOTICE 'Created: notification_translations table with RLS and index';
  RAISE NOTICE 'Seeded: 24 notification templates (12 types x 2 languages)';
  RAISE NOTICE 'Updated: user_profiles view and triggers to handle preferred_language';
END $$;
