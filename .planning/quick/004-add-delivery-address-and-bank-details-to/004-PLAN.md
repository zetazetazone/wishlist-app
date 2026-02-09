---
phase: quick-004
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - types/database.types.ts
  - lib/personalDetails.ts
  - lib/profileCompleteness.ts
  - components/profile/DeliveryAddressSection.tsx
  - components/profile/BankDetailsSection.tsx
  - components/profile/VisibilityToggle.tsx
  - app/(app)/settings/personal-details.tsx
autonomous: true
user_setup: []

must_haves:
  truths:
    - "User can enter delivery address (street, city, postal code, country) in personal details"
    - "User can enter bank details (account holder, IBAN or account number) in personal details"
    - "User can toggle visibility between 'Friends Only' (default) and 'Public'"
    - "Visibility setting controls whether details show to group members only vs all authenticated users"
    - "Delivery address and bank details appear in read-only member profile view"
  artifacts:
    - path: "components/profile/DeliveryAddressSection.tsx"
      provides: "Form section for delivery address input"
      min_lines: 60
    - path: "components/profile/BankDetailsSection.tsx"
      provides: "Form section for bank details input"
      min_lines: 50
    - path: "components/profile/VisibilityToggle.tsx"
      provides: "Toggle component for visibility setting"
      min_lines: 30
  key_links:
    - from: "app/(app)/settings/personal-details.tsx"
      to: "DeliveryAddressSection, BankDetailsSection, VisibilityToggle"
      via: "import and render in form"
      pattern: "DeliveryAddressSection|BankDetailsSection|VisibilityToggle"
    - from: "lib/personalDetails.ts"
      to: "types/database.types.ts"
      via: "TypedPersonalDetails type"
      pattern: "DeliveryAddress|BankDetails|visibility"
---

<objective>
Add personal delivery address and bank details to the profile section, with visibility toggles for sharing preferences.

Purpose: Users need to share delivery addresses for physical gift coordination and bank details for receiving money when pooling for gifts. The visibility toggle lets users control whether these sensitive details are visible to only group friends (default) or all authenticated users.

Output: Extended personal details form with new sections for delivery address, bank details, and visibility controls.
</objective>

<execution_context>
@/home/zetaz/.claude/get-shit-done/workflows/execute-plan.md
@/home/zetaz/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@types/database.types.ts
@lib/personalDetails.ts
@lib/profileCompleteness.ts
@components/profile/SizesSection.tsx
@app/(app)/settings/personal-details.tsx
@components/profile/PersonalDetailsReadOnly.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend type definitions and service layer</name>
  <files>
    types/database.types.ts
    lib/personalDetails.ts
    lib/profileCompleteness.ts
  </files>
  <action>
1. In `types/database.types.ts`, add new interfaces after `ExternalLink`:

```typescript
export interface DeliveryAddress {
  street?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}

export interface BankDetails {
  account_holder?: string;
  iban?: string;  // European IBAN
  account_number?: string;  // Alternative for non-IBAN regions
  bank_name?: string;  // Optional for clarity
}

export type VisibilitySetting = 'friends_only' | 'public';

export interface PersonalDetailsVisibility {
  delivery_address?: VisibilitySetting;
  bank_details?: VisibilitySetting;
}
```

2. Extend `PersonalSizes` interface to include the new fields (or create separate interfaces as shown above).

3. In `lib/personalDetails.ts`, update `TypedPersonalDetails` interface to include:
   - `delivery_address: DeliveryAddress`
   - `bank_details: BankDetails`
   - `visibility: PersonalDetailsVisibility`

4. Update `getPersonalDetails()` to parse the new JSONB fields with defaults:
   - `delivery_address: (data.delivery_address as DeliveryAddress) || {}`
   - `bank_details: (data.bank_details as BankDetails) || {}`
   - `visibility: (data.visibility as PersonalDetailsVisibility) || { delivery_address: 'friends_only', bank_details: 'friends_only' }`

5. Update `upsertPersonalDetails()` function signature and implementation to accept the new fields.

6. In `lib/profileCompleteness.ts`, update `calculateCompleteness()` to include:
   - Delivery address section (has street OR city filled = 1 section)
   - Bank details section (has iban OR account_number filled = 1 section)
   - Total sections: 6 existing + 2 new = 8 sections

NOTE: The database uses JSONB columns, so NO migration is needed. The existing `sizes`, `preferences`, `external_links` JSONB columns can store any JSON structure. We will repurpose the flexible JSONB approach by storing delivery_address, bank_details, and visibility in the existing `preferences` JSONB column OR by adding them as top-level properties that get stored via the existing upsert mechanism.

DECISION: Store new fields in the `preferences` JSONB column as nested objects to avoid schema changes:
- `preferences.delivery_address`
- `preferences.bank_details`
- `preferences.visibility`

Update TypedPersonalDetails to extract these from preferences and expose them at the top level for cleaner API.
  </action>
  <verify>
TypeScript compilation succeeds: `npx tsc --noEmit`
  </verify>
  <done>
New type definitions exist for DeliveryAddress, BankDetails, VisibilitySetting, and PersonalDetailsVisibility. Service layer supports reading/writing these fields.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create form components for delivery address, bank details, and visibility</name>
  <files>
    components/profile/DeliveryAddressSection.tsx
    components/profile/BankDetailsSection.tsx
    components/profile/VisibilityToggle.tsx
  </files>
  <action>
1. Create `DeliveryAddressSection.tsx` following `SizesSection.tsx` pattern:
   - Props: `address: DeliveryAddress`, `onChange: (address: DeliveryAddress) => void`
   - Fields: Street (TextInput), City (TextInput), Postal Code (TextInput), Country (Select dropdown with common countries or free text)
   - Helper text: "Where should gifts be delivered?"
   - Use same styling pattern: white background card, burgundy labels, outline inputs

2. Create `BankDetailsSection.tsx`:
   - Props: `bankDetails: BankDetails`, `onChange: (details: BankDetails) => void`
   - Fields: Account Holder Name (TextInput), IBAN (TextInput with placeholder "e.g., DE89370400440532013000"), Account Number (TextInput, shown as alternative), Bank Name (optional TextInput)
   - Helper text: "For receiving money when friends pool for your gifts"
   - Security note: "Only visible to your group members by default"

3. Create `VisibilityToggle.tsx`:
   - Props: `label: string`, `value: VisibilitySetting`, `onChange: (value: VisibilitySetting) => void`
   - Use SegmentedControl or two-button toggle pattern
   - Options: "Friends Only" (default, icon: users), "Public" (icon: globe)
   - Small helper text explaining the difference
   - Style: compact, inline with section headers

Use existing theme constants from `constants/theme.ts`. Follow the established component patterns in the profile folder.
  </action>
  <verify>
Files exist and export components:
```bash
ls -la components/profile/DeliveryAddressSection.tsx components/profile/BankDetailsSection.tsx components/profile/VisibilityToggle.tsx
```
TypeScript compilation succeeds: `npx tsc --noEmit`
  </verify>
  <done>
Three new components exist: DeliveryAddressSection, BankDetailsSection, and VisibilityToggle, following existing design patterns.
  </done>
</task>

<task type="auto">
  <name>Task 3: Integrate new sections into personal details screen and read-only view</name>
  <files>
    app/(app)/settings/personal-details.tsx
    components/profile/PersonalDetailsReadOnly.tsx
  </files>
  <action>
1. Update `app/(app)/settings/personal-details.tsx`:
   - Import new components: DeliveryAddressSection, BankDetailsSection, VisibilityToggle
   - Add state for new fields:
     ```typescript
     const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({});
     const [bankDetails, setBankDetails] = useState<BankDetails>({});
     const [visibility, setVisibility] = useState<PersonalDetailsVisibility>({
       delivery_address: 'friends_only',
       bank_details: 'friends_only',
     });
     ```
   - Update `loadDetails()` to populate new state from fetched data
   - Update `handleSave()` to include new fields in upsert call
   - Add sections to form JSX (after External Links section):
     - Delivery Address section with visibility toggle in header
     - Bank Details section with visibility toggle in header
   - Update completeness calculation to include new fields

2. Update `components/profile/PersonalDetailsReadOnly.tsx`:
   - Add display sections for delivery address (if has data)
   - Add display sections for bank details (if has data)
   - Respect visibility settings: only show if viewer is in same group (friends_only) or if set to public
   - For bank details, partially mask IBAN/account number for display (show last 4 digits only)
   - Style consistently with existing read-only sections

The visibility logic:
- `friends_only`: Data shown only when viewing within a group context (groupId is present in route params)
- `public`: Data shown to any authenticated user viewing the profile
  </action>
  <verify>
1. App starts without errors: `npx expo start` (visual check)
2. TypeScript compilation: `npx tsc --noEmit`
3. Navigate to Settings > Personal Details - new sections visible
4. Fill in delivery address and bank details, save, verify data persists on reload
  </verify>
  <done>
Personal details screen shows delivery address and bank details sections with visibility toggles. Data saves and loads correctly. Read-only member profile respects visibility settings.
  </done>
</task>

</tasks>

<verification>
1. Type check passes: `npx tsc --noEmit`
2. Personal details form shows all sections: Sizes, Preferences, External Links, Delivery Address, Bank Details
3. Visibility toggles work and persist their state
4. Data saves to Supabase and reloads correctly
5. Read-only view shows delivery/bank info (when appropriate visibility)
6. Completeness indicator reflects new sections (now 8 total)
</verification>

<success_criteria>
- User can enter and save delivery address in personal details
- User can enter and save bank details in personal details
- User can toggle visibility between "Friends Only" and "Public" for each section
- Data persists across app restarts
- Read-only member profile view shows the information respecting visibility settings
- Completeness indicator includes new sections
</success_criteria>

<output>
After completion, create `.planning/quick/004-add-delivery-address-and-bank-details-to/004-SUMMARY.md`
</output>
