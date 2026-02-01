# Add Wishlist Item Feature

## Overview

Feature for adding wishlist items by pasting Amazon product links.

## Components Created

### 1. AddItemModal (`components/wishlist/AddItemModal.tsx`)

A modal component with form inputs for:
- **Amazon URL** (required) - Validated to ensure it's a valid Amazon link
- **Product Title** (required) - Manual entry for now
- **Price** (optional) - Displayed with $ symbol
- **Priority** (1-5) - Visual selector with default value of 3

**Features:**
- Form validation before submission
- Loading states during submission
- Error handling with user-friendly alerts
- Keyboard-aware scrolling for mobile
- Clean form reset on success

### 2. WishlistItemCard (`components/wishlist/WishlistItemCard.tsx`)

Display component for individual wishlist items showing:
- Product title
- Price (if provided)
- Priority badge (color-coded: red=high, yellow=medium, green=low)
- Status badge
- "View on Amazon" button (opens link in browser)
- Delete button with confirmation dialog
- Timestamp of when item was added

**Priority Colors:**
- Priority 4-5: Red (High)
- Priority 3: Yellow (Medium)
- Priority 1-2: Green (Low)

### 3. Updated Wishlist Screen (`app/(app)/(tabs)/wishlist.tsx`)

Enhanced with:
- State management for items and modal visibility
- Supabase integration for CRUD operations
- Pull-to-refresh functionality
- Loading and empty states
- User authentication check

## Database Changes

### Migration: `supabase/migrations/001_make_group_id_nullable.sql`

**Changes:**
1. Made `group_id` nullable in `wishlist_items` table
   - Allows personal wishlist items not tied to any group
2. Updated Row Level Security (RLS) policies:
   - Users can view their own items OR items in groups they're members of
   - Users can insert/update/delete their own items

**Why nullable group_id?**
- Enables personal wishlists (MVP)
- Items can be assigned to groups later
- Simpler initial implementation

### Type Updates

Updated `WishlistItem` interface in `types/database.types.ts`:
- Changed `group_id: string` to `group_id?: string`

## Setup Instructions

### 1. Apply Database Migration

Run the migration in your Supabase SQL Editor:

```bash
cat supabase/migrations/001_make_group_id_nullable.sql
```

Copy and execute the SQL in your Supabase project.

### 2. Verify Environment Variables

Ensure `.env` file has your Supabase credentials:

```bash
EXPO_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Start the App

```bash
npm start
```

## How to Use

### Adding an Item

1. Navigate to the **Wishlist** tab
2. Tap the **"+ Add Item from Amazon"** button
3. Paste an Amazon product URL
4. Enter the product title
5. Optionally enter the price
6. Select priority (1-5, default is 3)
7. Tap **"Add Item"**

### Viewing Items

- Items are displayed in reverse chronological order (newest first)
- Each card shows title, price, priority, and status
- Pull down to refresh the list

### Opening Amazon Links

- Tap **"View on Amazon"** button on any item card
- Opens the product page in your default browser

### Deleting Items

1. Tap **"Delete"** button on an item card
2. Confirm deletion in the alert dialog
3. Item is removed from your wishlist

## Validation & Error Handling

### URL Validation
- Checks if URL is properly formatted
- Verifies URL contains "amazon" in hostname
- Shows error alert for invalid URLs

### Required Fields
- Amazon URL must be provided
- Product title must be provided
- Shows specific error messages for missing fields

### Error Scenarios
- Network errors: Displays user-friendly alert
- Database errors: Logged to console and shown to user
- Authentication errors: Prompts user to log in

## Future Enhancements

### Automatic Product Data Extraction
Currently, users manually enter title and price. Future improvements:

1. **Supabase Edge Function** to scrape Amazon pages
   - Bypasses CORS restrictions
   - Extracts title, price, image automatically
   - Can run server-side

2. **Third-Party API Integration**
   - LinkPreview API
   - ScraperAPI
   - Amazon Product Advertising API

### Example Edge Function (Future)

```typescript
// supabase/functions/scrape-amazon/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { url } = await req.json()

  // Fetch and parse Amazon page
  const response = await fetch(url)
  const html = await response.text()

  // Extract data using regex or HTML parser
  const title = extractTitle(html)
  const price = extractPrice(html)
  const imageUrl = extractImage(html)

  return new Response(
    JSON.stringify({ title, price, imageUrl }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

### Group Assignment
- Add group selector to AddItemModal
- Filter items by group
- Share items with group members

### Image Support
- Display product images
- Upload custom images
- Image carousel for multiple photos

### Advanced Features
- Edit existing items
- Mark items as purchased/received
- Contribution tracking
- Item notes/descriptions
- Share items via link

## Testing Checklist

- [ ] Add item with valid Amazon URL
- [ ] Add item with price
- [ ] Add item without price
- [ ] Try different priority levels
- [ ] Delete an item
- [ ] Open Amazon link in browser
- [ ] Pull to refresh list
- [ ] Test with empty wishlist
- [ ] Test with multiple items
- [ ] Verify persistence after app restart
- [ ] Test form validation
- [ ] Test error scenarios

## Known Limitations

1. **Manual Data Entry**: Users must enter title and price manually
   - Solution: Add server-side scraping (Edge Function)

2. **No Image Support**: Product images not displayed
   - Solution: Add image extraction and display

3. **No Group Assignment**: Items aren't assigned to groups yet
   - Solution: Add group selector in modal

4. **No Editing**: Can't edit items after creation
   - Solution: Add edit functionality

## Technical Details

### Dependencies Used
- React Native core components
- Supabase client (`@supabase/supabase-js`)
- NativeWind for styling
- React hooks for state management

### File Structure
```
wishlist-app/
├── components/wishlist/
│   ├── AddItemModal.tsx       # Add item form modal
│   └── WishlistItemCard.tsx   # Item display card
├── app/(app)/(tabs)/
│   └── wishlist.tsx           # Main wishlist screen
├── types/
│   └── database.types.ts      # Updated with nullable group_id
└── supabase/migrations/
    └── 001_make_group_id_nullable.sql
```

### State Management
- Local component state using `useState`
- Real-time updates via Supabase queries
- Optimistic UI updates for better UX

### Database Queries
- **Insert**: `supabase.from('wishlist_items').insert()`
- **Select**: `supabase.from('wishlist_items').select()`
- **Delete**: `supabase.from('wishlist_items').delete()`

## Troubleshooting

### Items not showing up
1. Check if user is logged in
2. Verify Supabase connection
3. Check browser console for errors
4. Verify RLS policies in Supabase

### Can't add items
1. Ensure database migration was applied
2. Check RLS policies allow INSERT
3. Verify user authentication
4. Check form validation errors

### Links not opening
1. Verify URL is valid
2. Check device can open URLs
3. Test with known working Amazon link

## Support

For issues or questions:
1. Check console logs for error messages
2. Verify Supabase configuration
3. Review migration was applied correctly
4. Check authentication status
