# Features Research: v1.3 Gift Claims & Personal Details

**Domain:** Social coordination / group gifting app
**Researched:** 2026-02-05
**Focus:** Gift claiming system and personal detail profiles for birthday coordination app

## Summary

Gift claiming and personal detail profiles are established patterns in the gifting app ecosystem, implemented by apps like Giftster, Giftful, Giftwhale, Favory, and DreamList. The core claim mechanic is well understood: one person reserves an item, the reservation is hidden from the recipient, and the item shows as "taken" to prevent duplicates. Split contributions (multiple people chipping in on one claimed item) are increasingly common but vary in implementation depth -- from simple tracking to full payment processing.

Personal detail profiles (sizes, preferences, hobbies) are a recognized differentiator in the space, with Giftster being the most prominent app offering a dedicated "Gift Preferences" page with clothing sizes, shoe sizes, favorite colors, and interests. The "secret notes" feature (group members adding hidden annotations about each other) is a genuinely novel feature -- no major competitor was found offering this exact capability. Elfster approaches it tangentially with anonymous Q&A during Secret Santa, but persistent per-member secret notes within a group context appear unique.

The existing codebase already has foundational pieces: `wishlist_items` has a `status` field with `'claimed'` as an option, a `contributions` table exists (though currently unused in favor of `celebration_contributions`), and the profile system (`user_profiles`) is minimal -- only storing `display_name`, `avatar_url`, and `birthday`. Both tables need extension, not replacement.

---

## Gift Claiming Features

### Table Stakes

Features users universally expect from a gift claiming system. Missing any of these would make the feature feel broken.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Single-claimer lock | Prevents duplicate gifts (the entire point of claiming) | Medium | `wishlist_items` table | Atomic UPDATE with `WHERE claimed_by IS NULL` in Postgres to prevent race conditions. Every major app (Giftster, Giftwhale, Giftful) enforces single-claimer. |
| Claim hidden from celebrant | Preserves gift surprise | Medium | Existing RLS patterns | Critical. Celebrant must NEVER see who claimed what. Supabase RLS policy: group members (non-celebrant) can see `claimed_by`; celebrant sees only boolean `is_taken`. Follows same pattern as existing chat room exclusion. |
| "Taken" indicator for celebrant | Celebrant knows item will be gifted without seeing who | Low | RLS view layer | Celebrant sees "Someone is getting this for you" or a simple checkmark. Giftwhale, Giftster, and Favory all show this. |
| Unclaim / release item | Allows course correction (changed mind, budget shifted) | Low | `wishlist_items` update | Only the claimer can unclaim. Sets `claimed_by` back to NULL, `status` back to `active`. Standard in all competitors. |
| Claim visible to other group members | Coordination -- other members know what is covered | Low | RLS policy | All non-celebrant group members see who claimed what. Prevents duplicate purchases and helps Gift Leader coordinate. |
| Claim button on wishlist item card | Clear, discoverable action to claim | Low | UI component | Single tap to claim. Confirmation dialog recommended ("Claim this item for [Celebrant]?"). |
| Visual distinction for claimed items | At-a-glance status when browsing list | Low | UI styling | Claimed items should look distinct: muted/dimmed, or overlay badge showing claimer's avatar. Unclaimed items look actionable. |

### Differentiators

Features that set this app apart from basic claiming. Not strictly expected, but valued.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Split contributions on claimed item | Multiple people chip in on expensive gifts | Medium | New `item_claims` or extend `contributions` table | Claimer toggles "Open for contributions." Others can pledge amounts toward the item. Progress bar shows funded percentage. Zola, Babylist, Target, DreamList all offer this. Key UX: claimer remains the "owner" who will purchase; others contribute funds externally. |
| Contribution progress bar | Visual funding status (e.g., "75% funded") | Low | Split contribution data | Shows total pledged vs. item price. Standard pattern from wedding/baby registries (Zola, Babylist). Only relevant when split is enabled. |
| Claim in both Gifts and Greetings modes | Claims work regardless of group mode | Low | Mode-conditional UI | Per PROJECT.md requirement. In Greetings mode, claiming still works for members who want to coordinate even without formal gift budget tracking. |
| Claim timestamp and history | Know when item was claimed, audit trail | Low | `claimed_at` column | Useful for Gift Leader to see coordination timeline. Low effort to add. |
| Claim notifications | Alert when someone claims an item from a list you're watching | Medium | Notification system | Push notification to Gift Leader and other group members (not celebrant) when a claim happens. Leverages existing notification infrastructure. |
| Claim count on celebration page | "3 of 8 items claimed" summary | Low | Aggregation query | Helps Gift Leader see overall progress at a glance without scrolling through every item. |

### Anti-Features

Features to deliberately NOT build. Common in competitors but wrong for this app.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| In-app payment processing for splits | Out of scope per PROJECT.md. Adds legal complexity (PCI compliance, payment disputes, refunds). DreamList explicitly avoids this too -- they track contributions but don't process payments. | Track contribution pledges only. Actual payment happens externally (Venmo, cash, etc.). Show "pledged" amounts for coordination. |
| Anonymous claiming (claimer hidden from ALL members) | Defeats coordination purpose. Gift Leader needs to know who claimed what to coordinate the celebration. Favory offers this for Secret Santa contexts, but this app's group coordination model needs transparency among non-celebrant members. | Claims visible to all group members except celebrant. Standard approach for birthday coordination. |
| Auto-purchase / buy-now integration | Massive scope creep. Requires retailer API integrations, payment processing, shipping logistics. No competitor in the social gifting space (as opposed to registry space) does this well. | Keep the app as a coordination tool. User claims item, purchases externally, marks as purchased. |
| Claim expiration / auto-release | Adds complexity and frustration. "Your claim expired" is a bad UX moment. Users may claim early and purchase later. | Allow manual unclaim only. If a claim feels stale, other members can message the claimer in the secret chat. Social pressure, not automated pressure. |
| Multiple claimers on same item (without split) | Confusing. Two people both "claiming" the same item without coordination leads to duplicate gifts -- the exact problem claiming solves. | One claimer per item. Claimer can optionally open for split contributions if they want help funding it. |
| Partial claiming (claim portion of quantity) | Wishlist items are single-quantity by design. No "quantity" field exists. Adding it adds unnecessary complexity for birthday gifting context. | One item = one claim. If someone wants multiples, they add multiple wishlist items. |
| Claiming Surprise Me / Mystery Box items | These special item types signal "surprise me with anything." Claiming them defeats the purpose -- they're not specific items to reserve. | Surprise Me and Mystery Box items are not claimable. They serve as inspiration signals for givers, not reservation targets. |

---

## Personal Details Features

### Table Stakes

Features users expect from a "personal details for gift-giving" profile.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Clothing sizes (shirt, shoe) | Most common gift-relevant sizing. Giftster's most-used preference fields per their help docs. | Low | New `personal_details` table or JSON column on `user_profiles` | Structured fields: shirt_size (XS-3XL), shoe_size (numeric + region), pants_size. Use dropdowns/pickers, not free text, for consistency. |
| Ring size | Relevant for jewelry gifts, especially in close friend groups | Low | Same as above | Optional field. Numeric with region indicator (US/EU). |
| Favorite colors | Universal gift-giving signal. Giftster prominently features this. | Low | Array/tags field | Multi-select from common colors, plus free-text for specific shades. |
| Favorite brands | Helps givers choose between alternatives | Low | Free-text tags | Tag-style input. No autocomplete needed -- too many brands. |
| Hobbies / interests | Broad gift category guidance | Low | Free-text tags | Tag-style input. Helps when giver has no specific item in mind. |
| Self-edited only | User controls their own profile data | Low | RLS policy | Only the profile owner can edit their personal details. Other users can view but not modify. Standard privacy expectation. |
| Global profile (shared across groups) | Avoids duplicate data entry per group | Low | Table design | Personal details are tied to user, not group. All groups the user belongs to can see the same profile. Per PROJECT.md requirement. |
| Viewable by group members | Other members can see your sizes and preferences when shopping | Low | RLS + UI | Any member of any shared group can view. Not public -- only visible to people in your groups. |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| External wishlist links (Amazon, etc.) | Bridge to existing wishlists the user already maintains elsewhere | Low | URL field(s) on profile | Array of {label, url} pairs. User can link their Amazon wishlist, Etsy favorites, Pinterest board, etc. Giftster's "Fetch" feature goes further (scraping items), but linking is sufficient and much simpler. |
| Secret notes about members | Group members can add hidden notes about each other, visible to all group members except the subject | High | New `member_notes` table with RLS | **Novel feature -- no major competitor offers this.** Example: "Sarah mentioned she wants a red KitchenAid mixer" or "Alex's ring size is actually 7, he just hasn't updated his profile." Scoped per group (notes in Group A are not visible in Group B). Subject (profile owner) never sees notes about themselves. RLS enforces this -- same pattern as celebrant exclusion. |
| "Dislikes" / "Please avoid" section | Equally valuable as preferences -- knowing what NOT to buy | Low | Text field or tags | "Allergic to wool," "Doesn't like gold jewelry," "No candles." Prevents well-intentioned but unwanted gifts. |
| Profile completeness indicator | Gentle nudge to fill in details | Low | Client-side calculation | "Your gift profile is 60% complete" with prompts for empty fields. Encourages data entry without being aggressive. |
| Last updated timestamp | Lets givers know if info is current | Low | `updated_at` column | "Sizes last updated 3 months ago" helps givers assess reliability of the data. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| AI-generated gift suggestions from profile | Out of scope per PROJECT.md. Scope creep. Requires AI integration, recommendation engine, product databases. | Show the raw preference data. Human givers make better personalized decisions than generic AI for close friends. |
| Privacy controls per field | Over-engineering. In a close friend group gifting app, granular field-level privacy (hide shoe size but show shirt size) adds complexity without clear value. | All-or-nothing: your personal details are visible to group members, or they're not. Keep it simple. |
| Profile photo in personal details section | Already exists in main profile (`user_profiles.avatar_url`). Duplicating it in personal details creates sync issues. | Personal details section links to / references existing profile photo. No duplication. |
| Automatic size detection / body scanning | Absurd scope creep. No gifting app does this. | Manual entry via dropdowns. |
| Social media profile links | Not gift-relevant. This is a gifting app, not a social network. LinkedIn/Instagram links don't help buy better gifts. | Keep external links focused on shopping-relevant destinations: Amazon wishlist, Etsy favorites, Pinterest boards. |
| Per-group personal details | Violates the "global profile" requirement from PROJECT.md. Also creates data maintenance burden -- updating shirt size in 5 groups separately. | One global personal details profile. All groups see the same data. |
| Secret notes visible to note author only | Defeats the purpose. If only the author can see their note, other members can't benefit from the insight. Creates information silos. | Secret notes are visible to ALL group members except the subject. Promotes collaborative gift-giving intelligence within the group. |

---

## Dependencies on Existing Features

### Gift Claims

| New Feature | Depends On | How It Integrates | Risk Level |
|-------------|------------|-------------------|------------|
| Claim mechanism | `wishlist_items` table | Add `claimed_by` (UUID, nullable FK to users) and `claimed_at` (timestamp) columns. Status field already has `'claimed'` value. | Low -- additive schema change |
| Claim visibility / celebrant exclusion | Existing RLS patterns | New RLS policy on `wishlist_items`: celebrant sees `status = 'claimed'` but not `claimed_by`. Non-celebrant group members see both. Mirrors `chat_rooms` and `celebration_contributions` exclusion patterns. | Medium -- RLS complexity, must test thoroughly |
| Split contributions | Existing `contributions` table | The `contributions` table already exists with `item_id`, `user_id`, `amount`, `status` fields. This is the natural home for split contributions. Currently unused (app uses `celebration_contributions` for per-celebration tracking). Can be activated for per-item splits. | Low -- table exists, needs activation |
| Claim notifications | Existing notification system | New notification type: `gift_claimed`. Route through existing `user_notifications` table and push delivery infrastructure. Filter out celebrant. | Low -- extends existing pattern |
| Claim in Greetings mode | Group mode system (v1.2) | Claims must work regardless of `groups.mode`. In Greetings mode, budget tracking is hidden but claiming still functions. UI conditionally shows/hides budget-related claim info. | Low -- conditional rendering |
| Claim on celebration page | Celebration system (v1.0) | Celebration page already shows celebrant's wishlist via `getWishlistItemsByUserId()`. Add claim buttons to each item card. Gift Leader sees all claims for coordination. | Low -- extends existing view |

### Personal Details

| New Feature | Depends On | How It Integrates | Risk Level |
|-------------|------------|-------------------|------------|
| Personal details profile | `user_profiles` table | Either extend `user_profiles` with new columns (sizes JSON, preferences JSON, external_links JSON) or create a separate `personal_details` table with FK to user. Separate table is cleaner -- avoids bloating the auth-critical profile table. | Low -- new table, no migration risk |
| Profile viewing | Profile page (`app/profile/[id].tsx`) | Extend existing profile page to show personal details section below current fields (name, birthday, member since). New section with sizes, preferences, links. | Low -- additive UI change |
| Profile editing | Settings profile page (`app/(app)/settings/profile.tsx`) | Add new sections to existing edit profile page. Currently only has display name and avatar. Add expandable sections for sizes, preferences, links. | Medium -- significant UI addition |
| Secret notes | Group membership system | New `member_notes` table: `id`, `group_id`, `about_user_id`, `author_id`, `content`, `created_at`. RLS: visible to group members where `about_user_id != auth.uid()`. Author can edit/delete their own notes. | High -- new RLS pattern, novel feature |
| Secret notes display | Profile page + group context | When viewing a member's profile from within a group context, show secret notes section. Must pass `group_id` context to profile page. Notes are per-group, not global. | Medium -- requires group context propagation |

---

## Competitive Analysis

### Gift Claiming Comparison

| Feature | This App (v1.3) | Giftster | Giftwhale | Giftful | Favory | DreamList |
|---------|-----------------|----------|-----------|---------|--------|-----------|
| Single-claimer lock | Planned | Yes | Yes (reservation) | Yes | Yes (anonymous) | N/A (fund-based) |
| Hidden from recipient | Planned | Yes | Yes | Yes | Yes | Yes |
| "Taken" indicator | Planned | Yes | No (fully hidden) | Yes | Yes | N/A |
| Unclaim/release | Planned | Yes | Yes | Yes | Unknown | N/A |
| Split contributions | Planned | No | No | No | No | Yes (partial funding) |
| Claim notifications | Planned | No | Yes (thank-you) | No | No | No |
| Secret chat for coordination | Existing (v1.0) | No | No | No | No | No |

**Key insight:** Split contributions on claimed items is a genuine differentiator in the social gifting space. Wedding/baby registries (Zola, Babylist, Target) have this, but social friend group apps (Giftster, Giftwhale) do not. This app bridges the gap -- group coordination with registry-style split funding. DreamList is the closest competitor with partial contributions, but they focus on long-term "dream" funding rather than birthday coordination.

### Personal Details Comparison

| Feature | This App (v1.3) | Giftster | Elfster | Giftful | Giftwhale |
|---------|-----------------|----------|---------|---------|-----------|
| Clothing sizes | Planned | Yes | No (via Q&A) | Unknown | No |
| Shoe sizes | Planned | Yes | No | Unknown | No |
| Ring size | Planned | No | No | No | No |
| Favorite colors | Planned | Yes | No | Unknown | No |
| Brands / interests | Planned | Yes (hobbies) | No | Unknown | No |
| External links | Planned | No (has Fetch URL) | No | No | No |
| Secret notes by members | Planned | No | Anonymous Q&A | No | No |
| Dislikes section | Potential | No | No | No | No |

**Key insight:** Giftster is the only major competitor with a robust "Gift Preferences" profile. This app's planned feature set matches Giftster's core offering and exceeds it with: ring sizes, external wishlist links, and the genuinely novel secret notes feature. The combination of structured personal details + secret notes from group members creates a richer gift-giving intelligence layer than any competitor.

### Secret Notes: Novel Feature Analysis

No major competitor offers persistent, per-member secret notes within a group context. The closest parallels are:

1. **Elfster's anonymous Q&A** -- During Secret Santa, you can ask your drawn person questions anonymously. But this is event-scoped, not persistent, and only available during active exchanges.

2. **Giftster's "I Got This" list** -- Tracks what you've already purchased (private to you). Not collaborative notes about a person.

3. **General chat** -- Most apps (including this one) have chat, but chat is temporal and conversation-scoped. Secret notes are persistent, person-scoped, and accumulated over time.

The secret notes feature is the strongest differentiator in v1.3. It creates a "collective memory" about each group member's preferences that persists across celebrations and grows richer over time. Example use cases:
- "Mentioned wanting a Le Creuset Dutch oven at dinner last week"
- "Already has a Nintendo Switch -- don't duplicate"
- "Ring size is 7 (she told me at the jeweler)"
- "Loves Earl Grey tea from Fortnum & Mason specifically"

---

## Feature Dependencies Diagram

```
                    Existing Features (v1.0-v1.2)
                    ==============================

    wishlist_items          user_profiles         group_members
    (has status field)      (name, avatar,        (group_id, user_id,
                             birthday)             role)
         |                       |                      |
         |                       |                      |
    -----+------           ------+------          ------+------
    |          |           |           |          |           |
    v          v           v           v          v           v
  CLAIMS    SPLITS    DETAILS     EDITING    NOTES      NOTES
  (add       (use      (new        (extend    (new       (RLS
  claimed_by  existing  personal_   settings   member_    group-
  column)    contri-   details     profile    notes      scoped
             butions   table)      page)      table)     visibility)
             table)
         |          |           |                |
         +----------+-----------+                |
                    |                            |
                    v                            v
              CELEBRATION PAGE              PROFILE PAGE
              (show claims +                (show details +
               split progress)              secret notes
                                            in group context)
```

---

## MVP Recommendation

For v1.3 MVP, prioritize in this order:

### Phase 1: Gift Claims (core)
1. **Single-claimer lock with atomic DB operation** -- Foundation of the feature
2. **Celebrant exclusion via RLS** -- Security-critical, same pattern as existing chat exclusion
3. **Claim/unclaim UI on wishlist item cards** -- User-facing interaction
4. **"Taken" indicator for celebrant** -- Completes the privacy loop

### Phase 2: Personal Details (core)
5. **Personal details table and editing UI** -- Sizes, preferences, links
6. **Profile viewing with details section** -- Extend existing profile page
7. **External wishlist links** -- Quick, high value

### Phase 3: Enhanced Claims + Secret Notes
8. **Split contributions on claimed items** -- Differentiator, builds on existing `contributions` table
9. **Secret notes** -- Novel feature, highest RLS complexity
10. **Claim notifications** -- Nice-to-have, extends existing infrastructure

**Rationale:** Claims are the higher-value feature (directly prevents duplicate gifts) and have simpler RLS requirements (extends existing patterns). Personal details are additive and lower risk. Secret notes are the most novel but also most complex (new RLS pattern), so they come last to reduce risk to the milestone.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Single-claimer mechanics | HIGH | Well-established pattern across all competitors. PostgreSQL atomic UPDATE is the proven approach. |
| Celebrant exclusion RLS | HIGH | This app already implements this pattern for chat rooms and contributions. Same technique applies. |
| Split contributions | MEDIUM | Pattern well-understood from registry apps (Zola, Babylist), but adapting to external-payment tracking (no in-app payments) is less documented. DreamList is closest reference. |
| Personal details schema | HIGH | Giftster's Gift Preferences page provides a clear template for field selection and organization. |
| Secret notes | MEDIUM | Novel feature with no direct competitor reference. RLS pattern is sound (mirrors celebrant exclusion), but UX for discovery and display needs careful design. How do users find/see notes? When viewing profile from group context? Separate notes tab? |
| Claiming special items (Surprise Me, Mystery Box) | HIGH | Clear anti-feature. These items are signals, not reservable products. No competitor claims "surprise me" style items. |
| Race conditions on claims | HIGH | PostgreSQL atomic conditional UPDATE (`WHERE claimed_by IS NULL`) is the textbook solution. Supabase supports this via RPC functions. |

---

## Sources

### Competitive Analysis
- [Giftster Gift Preferences Help](https://help.giftster.com/article/132-how-to-share-your-gift-preferences)
- [Giftster Finding Wish Lists](https://help.giftster.com/article/137-how-to-find-a-wish-list-or-gift-preferences)
- [Giftwhale: How to Choose the Right Wish List App in 2025](https://giftwhale.com/blog/how-to-choose-the-right-wish-list-app-in-2025)
- [Favory Privacy-First Wishlist Platform](https://www.openpr.com/news/4189488/favory-launches-privacy-first-wishlist-platform-with)
- [DreamList FAQ](https://www.dreamlist.com/giverfaq.html)
- [Presently Group Gifting](https://getpresently.com/)
- [Elfster Wikipedia](https://en.wikipedia.org/wiki/Elfster)

### Group Gifting / Split Contributions
- [Zola Group Gifting](https://www.zola.com/faq/115002838951-what-does-group-gifting-mean-on-my-registry-)
- [Babylist Group Gifts](https://help.babylist.com/hc/en-us/articles/360053206413-How-do-I-add-Group-Gifts-to-my-registry)
- [Target Group Gifting](https://targetsupport.egifter.com/hc/en-us/articles/115011382008-What-is-Group-Gifting-in-the-Target-Registry-)
- [Joy Group Gifting](https://withjoy.com/help/en/articles/9714104-group-gifting-and-how-does-it-work)
- [MyRegistry Partial Contributions](https://customercare.myregistry.com/en/support/solutions/articles/48000785740-how-can-my-guests-contribute-a-partial-amount-to-go-toward-a-big-item-on-my-registry-)
- [MyRegistry Group Gift Coordination Guide](https://guides.myregistry.com/wedding/group-gift-coordination-how-friends-can-pool-resources/)

### UX & Design Patterns
- [Baymard Institute: Gifting UX Best Practices](https://baymard.com/blog/gifting-flow)
- [NN/g: Wishlists, Gift Certificates, and Gift Giving](https://www.nngroup.com/articles/wishlists-gift-certificates/)
- [Giftster Revolutionizing Gift Giving](https://www.financialcontent.com/article/tokenring-2025-12-1-giftster-revolutionizing-the-art-of-giving-with-seamless-digital-wish-lists)

### Technical: Concurrency & RLS
- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Column Level Security](https://supabase.com/docs/guides/database/postgres/column-level-security)
- [Winning Race Conditions with PostgreSQL](https://dev.to/mistval/winning-race-conditions-with-postgresql-54gn)
- [PostgreSQL Atomic Updates](https://medium.com/insiderengineering/atomic-updates-keeping-your-data-consistent-in-a-changing-world-f6aacf38f71a)
- [Simple Locking Use Cases in PostgreSQL](http://mbukowicz.github.io/databases/2020/05/03/simple-locking-use-cases-in-postgresql.html)
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)

---

*Research completed: 2026-02-05*
