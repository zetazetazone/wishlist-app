# **Implementation Plan \- Wishlist Group Gifting App**

## **Goal**

Build a functional MVP of the Wishlist App using **React Native (Expo)** and **Supabase**. The app will allow users to create groups, share Amazon links, and coordinate gift purchases with a fair-share budget tracker.

## **User Review Required**

IMPORTANT

**Amazon Data Fetching**: For the MVP, we will attempt to fetch basic Open Graph metadata (Title/Image) from the client side. If strict CORS policies block this, we may need to deploy a small Supabase Edge Function later. For now, we will implement text inputs as a fallback.

## **Proposed Changes**

### 1\. Project Setup

* **Framework**: Expo (Managed Workflow) with TypeScript.  
* **Navigation**: Expo Router (File-based routing).  
* **Styling**: NativeWind (Tailwind CSS) for rapid, modern UI development.  
* **Backend**: Supabase JS Client.

### 2\. Database Schema (Supabase)

#### Users (`users`)

* `id`: uuid (PK, references auth.users)  
* `email`: unique string  
* `full_name`: string  
* `avatar_url`: string  
* `birthday`: date

#### Groups (`groups`)

* `id`: uuid (PK)  
* `name`: string  
* `created_by`: uuid (FK \-\> users.id)  
* `budget_limit_per_gift`: numeric (default cap for fairness)  
* `created_at`: timestamp

#### Group Members (`group_members`)

* `group_id`: uuid (FK)  
* `user_id`: uuid (FK)  
* `joined_at`: timestamp  
* `role`: string ('admin', 'member')

#### Wishlist Items (`wishlist_items`)

* `id`: uuid (PK)  
* `user_id`: uuid (FK \- The person who wants the gift)  
* `group_id`: uuid (FK \- Visible to this group)  
* `amazon_url`: string  
* `title`: string  
* `image_url`: string  
* `price`: numeric (estimated)  
* `priority`: integer (1-5)  
* `status`: string ('active', 'claimed', 'purchased', 'received', 'archived')

#### Contributions / Claims (`contributions`)

* *Tracks who is buying what and how much they spent.*  
* `id`: uuid (PK)  
* `item_id`: uuid (FK \-\> wishlist\_items)  
* `user_id`: uuid (FK \-\> The Buyer)  
* `amount`: numeric (Actual cost)  
* `status`: string ('pledged', 'paid')  
* `is_secret`: boolean (True \= Item owner cannot see this row)

### 3\. Frontend Architecture

#### Screens / Routes

* **(auth)**: Login / Signup  
* **(app)**:  
  * **(tabs)**  
    * **Home**: Upcoming Events list (Birthdays). Fairness Score (Who needs to buy next?).  
    * **My Wishlist**: Add items plan.  
    * **Groups**: Manage groups.  
  * **\[group\_id\]/wishlist/\[user\_id\]**: View a friend's wishlist.  
  * **Item Details**: Claim / Mark Purchased buttons.

### 4\. Logic & Features

#### Budget & Fairness

* **Fairness Score**: `(Total Contributed) / (Total Groups Active In)`.  
* UI will show "You are $X behind the group average" to encourage claiming the next gift.

## **Verification Plan**

### Automated Tests

* Integration tests not planned for MVP alpha.  
* Linting via ESLint.

### Manual Verification

1. **Auth Flow**: Sign up 2 accounts (User A, User B).  
2. **Group Flow**: User A creates group, invites User B.  
3. **Wishlist Flow**: User A adds Amazon Item.  
4. **Purchase Flow**:  
   * User B sees item.  
   * User B clicks "Secret Claim".  
   * User A checks list \-\> Status shows "Available" (or generic "Active") to them? *Wait, PRD says they shouldn't see status.*  
   * **Correction**: User A sees nothing changed. User B sees "Claimed by me".  
5. **Completion**: User B marks "Purchased". User A still sees nothing?  
   * *Refinement*: User A should only be notified when they mark it "Received" or if the event date passes?  
   * *Plan*: User A sees nothing until package arrives \=\> They click "Received" \-\> Cycle closes.

