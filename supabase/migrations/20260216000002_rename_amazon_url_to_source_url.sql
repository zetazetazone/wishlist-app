-- Rename amazon_url to source_url in wishlist_items table
-- This reflects the app's evolution from Amazon-only to supporting any retailer URL

-- Rename the column
ALTER TABLE public.wishlist_items
RENAME COLUMN amazon_url TO source_url;

-- Add a comment explaining the rename
COMMENT ON COLUMN public.wishlist_items.source_url IS
  'URL to product page (renamed from amazon_url to reflect support for any retailer)';
