-- Create user_profiles view for compatibility with app code
-- Maps users table columns to expected user_profiles schema

-- 1. Create the view
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT
  id,
  email,
  full_name AS display_name,
  avatar_url,
  birthday,
  onboarding_completed,
  created_at,
  updated_at
FROM public.users;

-- 2. Create INSTEAD OF triggers for INSERT/UPDATE/DELETE on the view

-- Function to handle INSERT on user_profiles view
CREATE OR REPLACE FUNCTION public.user_profiles_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, birthday, onboarding_completed, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.display_name,
    NEW.avatar_url,
    NEW.birthday,
    COALESCE(NEW.onboarding_completed, FALSE),
    COALESCE(NEW.created_at, NOW()),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle UPDATE on user_profiles view
CREATE OR REPLACE FUNCTION public.user_profiles_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET
    full_name = COALESCE(NEW.display_name, full_name),
    avatar_url = NEW.avatar_url,
    birthday = COALESCE(NEW.birthday, birthday),
    onboarding_completed = COALESCE(NEW.onboarding_completed, onboarding_completed),
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle DELETE on user_profiles view
CREATE OR REPLACE FUNCTION public.user_profiles_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the triggers
DROP TRIGGER IF EXISTS user_profiles_insert_trigger ON public.user_profiles;
CREATE TRIGGER user_profiles_insert_trigger
  INSTEAD OF INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.user_profiles_insert();

DROP TRIGGER IF EXISTS user_profiles_update_trigger ON public.user_profiles;
CREATE TRIGGER user_profiles_update_trigger
  INSTEAD OF UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.user_profiles_update();

DROP TRIGGER IF EXISTS user_profiles_delete_trigger ON public.user_profiles;
CREATE TRIGGER user_profiles_delete_trigger
  INSTEAD OF DELETE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.user_profiles_delete();

-- 4. Add comment
COMMENT ON VIEW public.user_profiles IS 'View mapping users table to user_profiles schema for app compatibility';
