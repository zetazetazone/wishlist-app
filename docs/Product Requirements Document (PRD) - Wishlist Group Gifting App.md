# **Product Requirements Document (PRD) \- Wishlist Group Gifting App**

## **1\. Introduction**

**Product Name:** (TBD) **Goal:** A mobile application (Android & iOS) to facilitate group gifting among friends by sharing Amazon wishlists and coordinating purchases within a set budget for specific celebrations (birthdays, etc.).

## **2\. Target Audience**

* Groups of friends who exchange gifts.  
* Users who use Amazon wishlists.  
* People who need reminders for special occasions.

## **3\. Core Features (MVP)**

### 3.1 User Management

* **Sign Up/Login:** Secure authentication (Email/Password or Social).  
* **Profile:** Basic info (Name, Birthday, Photo).

### 3.2 Groups

* **Create Group:** Users can create a "Circle" or "Group".  
* **Invite Members:** Invite friends via link or code.  
* **Budget Setting:** Admin or Group consensus sets a budget limit for gifts (e.g., "$50 max per person").

### 3.3 Wishlists

* **Amazon Integration:**  
  * **Link Import:** User pastes an Amazon link. App scrapes/fetches title, price, and image.  
  * **Monetization (Future):** Amazon Affiliate/Referral tag injection on outbound links.  
* **Item Details:** Title, Price, Image, Link, Priority.

### 3.4 Event & Alerts

* **Celebration Tracking:** Auto-creation of events based on birthdays key dates.  
* **Fairness Tracking (Budget Logic):**  
  * **Goal:** Equal contribution by all members by year-end.  
  * **Smart Assignment:** App highlights who has contributed least this year to encourage them to pick up the next gift.  
  * **Expense History:** Public log of "Who spent what" within the group.  
* **Reminders:**  
  * Notification cycle: "Birthday coming up" \-\> "Gift selection time" \-\> "Purchase reminder".

### 3.5 Purchase Flow

* **Claim System:** A group member "claims" an item.  
* **Secret Status:**  
  * The status (Claimed/Purchased) is **hidden** from the recipient (the "Celebrated Person") to keep the surprise.  
  * Other group members see the status to avoid duplicates.  
* **Purchase:** User buys the item directly on Amazon.  
* **Confirmation:** User marks item as "Purchased" and inputs cost. Group is notified (except recipient).  
* **Reception:**  
  * The recipient marks the item as "Received" when it physically arrives.  
  * **Celebration Alert:** Entire group gets a "Successfully Delivered\!" notification.  
* **Gift Card Fallback:**  
  * If a desired item exceeds the single-person budget cap, the app suggests buying an Amazon Gift Card.  
  * User records "Gift Card \- $X amount" as their contribution.

## **4\. Technical Constraints & Assumptions**

* **Platform:** Cross-platform Mobile App (React Native or Flutter recommended for MVP).  
* **Backend:** Firebase or Supabase for real-time updates and auth.  
* **Amazon Data:** Likely scraping or parsing Open Graph data from links (Amazon API has strict access requirements).

## **5\. Open Questions (Resolved)**

1. **Purchase Flow:** Single buyer per item (Claim \-\> Buy \-\> Mark).  
2. **Amazon Import:** Paste Link.  
3. **Budget Logic:** "Fairness" model. Track spend history; suggest Gift Cards for expensive items.

## **6\. Technology Stack (Selected)**

* **Frontend:** React Native (Expo) \- TypeScript.  
* **Backend:** Supabase (Postgres Database, Auth, Realtime).  
* **Link Preview:** Supabase Edge Function (or simple client-side fetch if possible) for Amazon metadata.

