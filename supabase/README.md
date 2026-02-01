# Supabase Database Migrations

This directory contains all database migrations for the wishlist app.

## Directory Structure

```
supabase/
├── migrations/          # SQL migration files
│   ├── YYYYMMDDHHMMSS_description.sql
│   └── ...
└── README.md           # This file
```

## Migration Naming Convention

Migrations follow the format: `YYYYMMDDHHMMSS_description.sql`

- **Timestamp**: YYYYMMDDHHMMSS (ensures ordering)
- **Description**: Snake_case description of the change

Example: `20260201000001_initial_schema.sql`

## How to Apply Migrations

### Via Supabase Dashboard (Current Method)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of the migration file
4. Paste and execute in the SQL editor

### Via Supabase CLI (Future)

If you set up Supabase CLI locally:

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Apply all pending migrations
supabase db push
```

## Migration Files

### 20260201000001_initial_schema.sql
- Creates all initial tables (users, groups, group_members, wishlists, wishlist_items)
- Sets up RLS policies
- Creates indexes
- Sets up triggers for updated_at timestamps

### 20260201000002_fix_rls_policies.sql
- Fixes RLS policy infinite recursion issues
- Updates group and user policies
- Ensures proper permissions for group operations

## Best Practices

1. **Never modify applied migrations** - Create a new migration instead
2. **Keep migrations small and focused** - One logical change per migration
3. **Test migrations locally first** - If possible, test in a development database
4. **Document complex changes** - Add comments explaining the reasoning
5. **Version control all migrations** - Commit migrations to git

## Creating New Migrations

When you need to make database changes:

1. Create a new file with the current timestamp:
   ```bash
   touch supabase/migrations/$(date +%Y%m%d%H%M%S)_your_description.sql
   ```

2. Write your SQL changes in the file

3. Apply to Supabase via SQL Editor

4. Commit to version control

## Rollback Strategy

For rollbacks:
- Keep a copy of the database state before major changes
- Document any data migrations in the migration file
- Consider writing a corresponding rollback SQL file for complex migrations
