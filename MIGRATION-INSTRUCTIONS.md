# Database Migration Instructions

## Issue
The current database constraint `UNIQUE(chest_no, user_id)` prevents the same student from participating in multiple programs. This needs to be changed to `UNIQUE(chest_no, program_id, user_id)` to allow students to participate in multiple programs while preventing duplicate registrations for the same program.

## Error Details
- **Error Code**: 23505
- **Error Message**: "duplicate key value violates unique constraint \"students_chest_no_user_id_key\""
- **Impact**: Students cannot be registered for multiple programs

## Solution
Run the migration script to update the database constraint.

## Steps to Apply Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Open [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Navigate to your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run Migration Script**
   - Copy and paste the content from `migration-students-constraint.sql`
   - Click "Run" to execute the migration

4. **Verify Migration**
   - Check that the old constraint is removed
   - Check that the new constraint is added
   - Test bulk student upload

### Option 2: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db reset --db-url "your-database-url"
# Then apply the updated schema
```

## Migration Script Content

```sql
-- Migration to update students table constraint
-- This allows the same student (chest_no) to participate in multiple programs
-- but prevents duplicate registrations for the same program

-- Drop the old constraint
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_chest_no_user_id_key;

-- Add the new constraint that allows same student in multiple programs
ALTER TABLE students ADD CONSTRAINT students_chest_no_program_user_unique 
  UNIQUE(chest_no, program_id, user_id);

-- Update the comment for clarity
COMMENT ON CONSTRAINT students_chest_no_program_user_unique ON students 
IS 'Ensures same student cannot be registered for the same program twice, but allows multiple program registrations';
```

## After Migration

Once the migration is complete:

1. **Test Bulk Upload**
   - Same student should be able to register for multiple programs
   - Duplicate program registrations should still be prevented

2. **Expected Behavior**
   - ✅ Student 413 → BURDA program: **ALLOWED**
   - ✅ Student 413 → HAND CRAFT program: **ALLOWED** 
   - ❌ Student 413 → BURDA program (again): **REJECTED**

3. **Verification Query**
   ```sql
   -- Check constraint exists
   SELECT constraint_name, constraint_type 
   FROM information_schema.table_constraints 
   WHERE table_name = 'students' AND constraint_type = 'UNIQUE';
   ```

## Rollback (If Needed)

If you need to rollback this change:

```sql
-- Remove new constraint
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_chest_no_program_user_unique;

-- Restore old constraint (WARNING: This will prevent multiple program registrations)
ALTER TABLE students ADD CONSTRAINT students_chest_no_user_id_key UNIQUE(chest_no, user_id);
```

## Notes

- **Data Safety**: This migration is safe and won't delete any data
- **Downtime**: No downtime expected for this constraint change
- **Testing**: Test bulk upload functionality after migration