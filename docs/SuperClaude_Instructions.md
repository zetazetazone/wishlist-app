claude --dangerously-skip-permissions
#######################################

Join "borrachos" on Wishlist App!

Invite Code: 6d90b0d4-83f0-4484-bc42-646bab51e269

Use this code to join our gift-giving group.


##########################
START SERVER INSTRUCTIONS
##########################

npx expo start --dev-client --clear

npx expo start --host tunnel 

npx supabase link --project-ref txtlgfrgrrqhztngpvaa

npx eas build --profile development

####################################
           TROUBLESHOOT
####################################

# 1. Problem Analysis

/sc:troubleshoot --investigate --prod --persona-analyzer

# 2. Root Cause Analysis

/sc:troubleshoot --prod --five-whys --seq --persona-analyzer

# 3. Performance Analysis

/sc:analyze --profile --perf --seq --persona-performance

# 4. Fix Implementation

/sc:improve --quality --threshold 95% --persona-refactorer


####################################
              PLAN
####################################

# 1. Project Planning

/sc:design --api --ddd --plan --persona-architect

# 2. Frontend Development

/sc:build --react-native --tdd --persona-frontend

# 3. Backend Development

/sc:build --api --tdd --coverage --persona-backend

# 4. Quality Check

/sc:review --quality --evidence --persona-qa

# 5. Security Scan

/sc:analyze --security --owasp --persona-security

# 6. Performance Optimization

/sc:improve --performance --iterate --persona-performance

# 7. Deployment Preparation

/sc:deploy --env staging --plan --persona-architect

Custom Workflows
Bug Investigation Workflow:

/sc:troubleshoot "specific error" --seq --think --validate
/sc:analyze affected-files/ --focus quality --persona-analyzer  
/sc:test --play --coverage

Feature Development Workflow:

/sc:design new-feature --persona-architect --c7
/sc:build --persona-frontend --validate --magic
/sc:test --play --coverage
/sc:document --persona-scribe --c7










.........................................
Test 2: Viewing Claims by Others (User B)
  1. Have another user (or in another session) claim a different item
  2. As User B, refresh the celebration page:
    - Claimed items show small claimer avatar
    - Tapping avatar shows popup with claimer's name
    - You can still see who claimed what

  Test 3: Unclaim Flow (User B)
  1. As User B, find an item you claimed
  2. Tap "Unclaim":
    - Confirmation dialog appears
    - After confirming, claim is released
    - Item shows "Claim" button again

  Test 4: Celebrant Taken View (User A)
  1. Login as User A (the celebrant)
  2. Navigate to My Wishlist screen:
    - Claimed items show gift icon badge (TakenBadge)
    - Claimed items appear dimmed/faded
    - Claimed items are at bottom of list
    - NO claim buttons visible anywhere
    - NO claimer names or avatars visible
    - Header shows "X of Y items taken" counter

  Test 5: Celebrant Viewing Own Celebration (User A)
  1. As User A, navigate to your own celebration page:
    - NO claim buttons visible on your wishlist items
    - NO claimer information visible

  Test 6: Race Condition (Optional)
  1. Have two users try to claim the same item simultaneously:
    - One succeeds, one gets "Already Claimed" message
    - Both see correct state after refresh


    