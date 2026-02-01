# Wishlist Group Gifting App

A mobile application for coordinating group gifting among friends using Amazon wishlists.

## Tech Stack

- **Frontend**: React Native with Expo
- **Language**: TypeScript
- **Routing**: Expo Router (file-based routing)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend**: Supabase (Auth, Database, Realtime)
- **State Management**: React hooks + Supabase realtime

## Project Structure

```
wishlist-app/
├── app/                      # Expo Router file-based routing
│   ├── _layout.tsx          # Root layout with auth state management
│   ├── auth/                # Authentication screens
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── signup.tsx
│   └── (app)/               # Protected app routes
│       ├── _layout.tsx
│       └── (tabs)/          # Tab navigation
│           ├── _layout.tsx
│           ├── index.tsx    # Home (Upcoming Events)
│           ├── wishlist.tsx # My Wishlist
│           └── groups.tsx   # My Groups
├── components/              # Reusable components
│   ├── ui/                 # UI components
│   ├── auth/               # Auth-related components
│   ├── wishlist/           # Wishlist components
│   └── groups/             # Group components
├── lib/                    # Libraries and configs
│   └── supabase.ts        # Supabase client configuration
├── utils/                  # Utility functions
│   └── auth.ts            # Authentication utilities
├── types/                  # TypeScript type definitions
│   ├── database.types.ts  # Database schema types
│   └── index.ts           # Exported types
└── docs/                   # Documentation
    ├── PRD.md
    └── Implementation Plan.md
```

## Setup Instructions

### 1. Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### 2. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Update `.env` file with your credentials:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-url.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Set Up Database Schema

Run the following SQL in your Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  birthday DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  budget_limit_per_gift NUMERIC DEFAULT 50.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group members table
CREATE TABLE public.group_members (
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- Wishlist items table
CREATE TABLE public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  amazon_url TEXT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  price NUMERIC,
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status TEXT CHECK (status IN ('active', 'claimed', 'purchased', 'received', 'archived')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contributions table
CREATE TABLE public.contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES public.wishlist_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT CHECK (status IN ('pledged', 'paid')) DEFAULT 'pledged',
  is_secret BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT CHECK (event_type IN ('birthday', 'custom')) DEFAULT 'birthday',
  event_date DATE NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Basic - can be refined later)

-- Users: Can read all users, can only update own profile
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Groups: Can view groups they're members of
CREATE POLICY "Users can view their groups" ON public.groups FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = id AND user_id = auth.uid()
  ));

-- Group members: Can view members of groups they're in
CREATE POLICY "Users can view group members" ON public.group_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()
  ));

-- Wishlist items: Can view items in their groups
CREATE POLICY "Users can view group wishlist items" ON public.wishlist_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = wishlist_items.group_id AND user_id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX idx_group_members_user ON public.group_members(user_id);
CREATE INDEX idx_group_members_group ON public.group_members(group_id);
CREATE INDEX idx_wishlist_items_user ON public.wishlist_items(user_id);
CREATE INDEX idx_wishlist_items_group ON public.wishlist_items(group_id);
CREATE INDEX idx_contributions_item ON public.contributions(item_id);
CREATE INDEX idx_events_date ON public.events(event_date);
```

### 4. Run the App

Start the development server:

```bash
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

## Current Status

✅ **Completed**:
- Project initialization with Expo + TypeScript
- NativeWind (Tailwind) configuration
- Expo Router file-based routing structure
- Supabase client setup
- Authentication screens (Login/Signup)
- Basic tab navigation (Home, Wishlist, Groups)
- Type definitions for database schema
- Authentication utilities

## Next Steps

### Immediate (Week 1-2):
1. **Test Authentication Flow**
   - Set up Supabase project
   - Test signup and login
   - Verify email confirmation flow

2. **Build Groups Feature**
   - Create Group screen
   - Join Group functionality
   - Group member list

3. **Build Wishlist Feature**
   - Add item form (manual entry)
   - Display wishlist items
   - Edit/delete items

### Short Term (Week 2-3):
4. **Purchase Flow**
   - Claim item functionality
   - Mark as purchased
   - Mark as received
   - Secret status logic

5. **Event Reminders**
   - Birthday event creation
   - Upcoming events display
   - Notification system setup

### Medium Term (Week 3-4):
6. **Amazon Integration**
   - Link preview fetching
   - Image/title extraction
   - Price display

7. **Budget Tracking**
   - Fairness calculator
   - Contribution history
   - Group spending overview

## Development Notes

- **Authentication**: Uses Supabase Auth with email/password
- **Routing**: Protected routes automatically redirect unauthenticated users
- **Styling**: NativeWind classes work just like Tailwind CSS
- **State**: Currently using React hooks; may add context providers as needed

## Known Issues / Limitations

1. Amazon link scraping may be blocked by CORS - will need server-side solution
2. Push notifications not yet implemented
3. No offline support yet
4. Gift card flow not implemented

## Resources

- [Expo Documentation](https://docs.expo.dev)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [Supabase Documentation](https://supabase.com/docs)
- [NativeWind Documentation](https://www.nativewind.dev)
