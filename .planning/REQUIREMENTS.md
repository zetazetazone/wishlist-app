# Requirements: Wishlist Group Gifting App

**Defined:** 2026-02-11
**Core Value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.

## v1.5 Requirements

Requirements for the Localization milestone. Each maps to roadmap phases.

### Infrastructure

- [ ] **INFRA-01**: App auto-detects device language on first launch using expo-localization
- [ ] **INFRA-02**: App falls back to English when device language is not supported
- [ ] **INFRA-03**: Translation keys are TypeScript-safe with auto-complete support

### Translation

- [ ] **TRANS-01**: All UI text is translated (buttons, labels, headings, placeholders)
- [ ] **TRANS-02**: All system messages are translated (alerts, toasts, errors)
- [ ] **TRANS-03**: Date and time displays are localized (e.g., "11 de febrero" in Spanish)
- [ ] **TRANS-04**: English translation file contains all ~400 app strings
- [ ] **TRANS-05**: Spanish translation file contains all ~400 app strings

### Persistence

- [ ] **PERS-01**: User's language preference persists locally across app restarts
- [ ] **PERS-02**: User's language preference syncs to server (Supabase profiles)
- [ ] **PERS-03**: Language preference syncs across user's devices

### Settings

- [ ] **SETT-01**: User can change language in profile settings
- [ ] **SETT-02**: Language change takes effect instantly without app restart

### Notifications

- [ ] **NOTIF-01**: Push notifications are sent in user's preferred language
- [ ] **NOTIF-02**: All notification types have English and Spanish templates

## v1.6+ Requirements

Deferred to future release. Tracked but not in current roadmap.

### Additional Languages

- **LANG-01**: App supports Portuguese language
- **LANG-02**: App supports French language
- **LANG-03**: Regional Spanish variants (es-MX, es-ES)

### Advanced Features

- **ADV-01**: Number and currency formatting is locale-aware
- **ADV-02**: iOS per-app language setting support (iOS 13+)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| RTL (Right-to-Left) support | Neither English nor Spanish require RTL; adds complexity with zero user benefit |
| User-generated content translation | Wishlist items, chat messages, notes are user content; auto-translating creates confusion |
| Dynamic translation fetching | For 2 languages, bundled JSON files are simpler and work offline |
| Flag-based language selector | Flags represent countries not languages; Spanish is spoken in 20+ countries |
| Machine translation fallback | Shows unprofessional results when translation keys are missing |
| Currency conversion | Massive complexity; display prices as entered by item creator |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 29 | Pending |
| INFRA-02 | Phase 29 | Pending |
| INFRA-03 | Phase 29 | Pending |
| TRANS-01 | Phase 32 | Pending |
| TRANS-02 | Phase 32 | Pending |
| TRANS-03 | Phase 32 | Pending |
| TRANS-04 | Phase 30 | Pending |
| TRANS-05 | Phase 30 | Pending |
| PERS-01 | Phase 29 | Pending |
| PERS-02 | Phase 30 | Pending |
| PERS-03 | Phase 30 | Pending |
| SETT-01 | Phase 31 | Pending |
| SETT-02 | Phase 31 | Pending |
| NOTIF-01 | Phase 30 | Pending |
| NOTIF-02 | Phase 30 | Pending |

**Coverage:**
- v1.5 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-11 after roadmap creation*
