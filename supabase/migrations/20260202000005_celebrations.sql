-- Celebrations & Coordination Schema
-- Phase 02: Gift Leader assignment, secret chat rooms, contribution tracking
-- SECURITY CRITICAL: Celebrant exclusion via RLS policies

-- ============================================
-- TABLE 1: celebrations
-- One celebration per birthday per year
-- ============================================

CREATE TABLE IF NOT EXISTS public.celebrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  celebrant_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  event_date DATE NOT NULL,
  year INTEGER NOT NULL,
  gift_leader_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_amount NUMERIC DEFAULT NULL,  -- Optional target for progress bar
  status TEXT CHECK (status IN ('upcoming', 'active', 'completed')) DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, celebrant_id, year)
);

-- Enable RLS immediately
ALTER TABLE public.celebrations ENABLE ROW LEVEL SECURITY;

-- Group members can view all celebrations in their groups
-- Note: Celebrant CAN see their celebration exists, just not chat/contributions
CREATE POLICY "Group members can view celebrations"
  ON public.celebrations FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = celebrations.group_id
        AND gm.user_id = auth.uid()
    )
  );

-- Group admins can create celebrations
CREATE POLICY "Group admins can create celebrations"
  ON public.celebrations FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = celebrations.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

-- Group admins can update celebrations (status, gift_leader, target_amount)
CREATE POLICY "Group admins can update celebrations"
  ON public.celebrations FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = celebrations.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

-- ============================================
-- TABLE 2: chat_rooms
-- One chat room per celebration
-- ============================================

CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES public.celebrations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS immediately
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Group members EXCEPT celebrant can view chat room
CREATE POLICY "Group members except celebrant can view chat room"
  ON public.chat_rooms FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.celebrations c
      JOIN public.group_members gm ON gm.group_id = c.group_id
      WHERE c.id = chat_rooms.celebration_id
        AND gm.user_id = auth.uid()
        AND c.celebrant_id != auth.uid()  -- EXCLUDES CELEBRANT
    )
  );

-- Chat rooms are created automatically with celebrations (via trigger or application)
CREATE POLICY "System can create chat rooms"
  ON public.chat_rooms FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.celebrations c
      JOIN public.group_members gm ON gm.group_id = c.group_id
      WHERE c.id = chat_rooms.celebration_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

-- ============================================
-- TABLE 3: chat_messages
-- Messages in chat rooms
-- ============================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  content TEXT NOT NULL,
  linked_item_id UUID REFERENCES public.wishlist_items(id) ON DELETE SET NULL,  -- For CHAT-03 linking
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS immediately
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Group members EXCEPT celebrant can view messages
CREATE POLICY "Group members except celebrant can view messages"
  ON public.chat_messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms cr
      JOIN public.celebrations c ON c.id = cr.celebration_id
      JOIN public.group_members gm ON gm.group_id = c.group_id
      WHERE cr.id = chat_messages.chat_room_id
        AND gm.user_id = auth.uid()
        AND c.celebrant_id != auth.uid()  -- EXCLUDES CELEBRANT
    )
  );

-- CRITICAL: Group members EXCEPT celebrant can send messages
CREATE POLICY "Group members except celebrant can send messages"
  ON public.chat_messages FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_rooms cr
      JOIN public.celebrations c ON c.id = cr.celebration_id
      JOIN public.group_members gm ON gm.group_id = c.group_id
      WHERE cr.id = chat_messages.chat_room_id
        AND gm.user_id = auth.uid()
        AND c.celebrant_id != auth.uid()  -- EXCLUDES CELEBRANT
    )
  );

-- ============================================
-- TABLE 4: celebration_contributions
-- Per-celebration pot (user decision from CONTEXT.md)
-- ============================================

CREATE TABLE IF NOT EXISTS public.celebration_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES public.celebrations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(celebration_id, user_id)  -- One contribution per user per celebration
);

-- Enable RLS immediately
ALTER TABLE public.celebration_contributions ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Group members EXCEPT celebrant can view contributions
CREATE POLICY "Group members except celebrant can view contributions"
  ON public.celebration_contributions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.celebrations c
      JOIN public.group_members gm ON gm.group_id = c.group_id
      WHERE c.id = celebration_contributions.celebration_id
        AND gm.user_id = auth.uid()
        AND c.celebrant_id != auth.uid()  -- EXCLUDES CELEBRANT
    )
  );

-- Users can add their own contributions (except celebrant)
CREATE POLICY "Users can add own contributions"
  ON public.celebration_contributions FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.celebrations c
      JOIN public.group_members gm ON gm.group_id = c.group_id
      WHERE c.id = celebration_contributions.celebration_id
        AND gm.user_id = auth.uid()
        AND c.celebrant_id != auth.uid()  -- EXCLUDES CELEBRANT
    )
  );

-- Users can update their own contributions (except celebrant)
CREATE POLICY "Users can update own contributions"
  ON public.celebration_contributions FOR UPDATE USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.celebrations c
      JOIN public.group_members gm ON gm.group_id = c.group_id
      WHERE c.id = celebration_contributions.celebration_id
        AND gm.user_id = auth.uid()
        AND c.celebrant_id != auth.uid()  -- EXCLUDES CELEBRANT
    )
  );

-- Users can delete their own contributions
CREATE POLICY "Users can delete own contributions"
  ON public.celebration_contributions FOR DELETE USING (
    user_id = auth.uid()
  );

-- ============================================
-- TABLE 5: gift_leader_history
-- Audit trail for Gift Leader assignments and reassignments
-- ============================================

CREATE TABLE IF NOT EXISTS public.gift_leader_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES public.celebrations(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,  -- NULL = auto-assigned
  reason TEXT CHECK (reason IN ('auto_rotation', 'manual_reassign', 'member_left')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS immediately
ALTER TABLE public.gift_leader_history ENABLE ROW LEVEL SECURITY;

-- Group members can view history (no celebrant exclusion - history is not secret)
CREATE POLICY "Group members can view gift leader history"
  ON public.gift_leader_history FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.celebrations c
      JOIN public.group_members gm ON gm.group_id = c.group_id
      WHERE c.id = gift_leader_history.celebration_id
        AND gm.user_id = auth.uid()
    )
  );

-- Group admins can insert history records
CREATE POLICY "Group admins can insert gift leader history"
  ON public.gift_leader_history FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.celebrations c
      JOIN public.group_members gm ON gm.group_id = c.group_id
      WHERE c.id = gift_leader_history.celebration_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_celebrations_group ON public.celebrations(group_id);
CREATE INDEX IF NOT EXISTS idx_celebrations_celebrant ON public.celebrations(celebrant_id);
CREATE INDEX IF NOT EXISTS idx_celebrations_event_date ON public.celebrations(event_date);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON public.chat_messages(chat_room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_celebration_contributions_celebration ON public.celebration_contributions(celebration_id);
CREATE INDEX IF NOT EXISTS idx_gift_leader_history_celebration ON public.gift_leader_history(celebration_id);

-- ============================================
-- REALTIME
-- Enable realtime for chat messages
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- ============================================
-- COMPLETED
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Celebrations schema created successfully!';
  RAISE NOTICE '5 tables: celebrations, chat_rooms, chat_messages, celebration_contributions, gift_leader_history';
  RAISE NOTICE 'SECURITY: Celebrant exclusion RLS policies enabled for chat and contributions';
END $$;
