-- Migration: Add owner fields to wishlists table
-- Purpose: Allow wishlists to be created for self, a manually-entered person, or a friend

-- Add owner_type column with CHECK constraint for valid values
ALTER TABLE wishlists
ADD COLUMN owner_type TEXT DEFAULT 'self' CHECK (owner_type IN ('self', 'other_manual', 'other_user'));

-- Add for_user_id column (FK to users) for 'other_user' type
-- References the friend's user_id when creating a wishlist for a friend
ALTER TABLE wishlists
ADD COLUMN for_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add for_name column for 'other_manual' type
-- Stores the manually entered name when creating a wishlist for someone not on the app
ALTER TABLE wishlists
ADD COLUMN for_name TEXT;

-- Add CHECK constraint to ensure proper field population based on owner_type
-- - When owner_type = 'other_manual', for_name must not be null
-- - When owner_type = 'other_user', for_user_id must not be null
ALTER TABLE wishlists
ADD CONSTRAINT wishlists_owner_type_fields_check CHECK (
  (owner_type = 'self') OR
  (owner_type = 'other_manual' AND for_name IS NOT NULL) OR
  (owner_type = 'other_user' AND for_user_id IS NOT NULL)
);

-- Add comments documenting the columns
COMMENT ON COLUMN wishlists.owner_type IS 'Who this wishlist is for: self (owner), other_manual (non-app user by name), other_user (app user by ID)';
COMMENT ON COLUMN wishlists.for_user_id IS 'When owner_type=other_user, references the friend user this wishlist is for';
COMMENT ON COLUMN wishlists.for_name IS 'When owner_type=other_manual, stores the name of the person this wishlist is for';
