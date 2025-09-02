# Fix for Program Winners Prize Display Issue

## Issue Description
Program Winners page shows "No prize assigned" and suggests "Configure in Program Assignments" even when prizes are properly assigned in the Program Prize Assignments section.

## Root Cause
The `program_winners_view` database view has incorrect JOIN conditions that prevent proper linking between:
- Program Winners (students who won placements)
- Program Prize Assignments (which prizes are awarded for which placements)

The specific issues were:
1. Missing `user_id` constraints in base table JOINs for proper Row Level Security (RLS)
2. The prize assignment JOIN condition requires exact placement string matching

## Solution
Update the `program_winners_view` with proper JOIN conditions and RLS filtering.

## Steps to Apply Fix

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Open [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Navigate to your program-manager project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run Migration Script**
   - Copy and paste the content from `fix-program-winners-view.sql`
   - Click "Run" to execute the migration

4. **Verify Fix**
   - Go to your Program Winners page in the application
   - Check that prizes now display correctly for students who have won placements
   - Verify that the prize information shows:
     - Prize name
     - Prize category
     - Prize value (if set)
     - Prize description

### Option 2: Using Database Tool
If you have direct database access, you can run the SQL from `fix-program-winners-view.sql` directly.

## What This Fix Does

The migration:
1. **Drops** the existing `program_winners_view`
2. **Recreates** the view with proper JOIN conditions
3. **Adds** user_id filtering to all JOINs for proper RLS
4. **Maintains** the existing LEFT JOIN for prize assignments (so winners without prizes still show)
5. **Grants** proper access permissions

## Expected Behavior After Fix

✅ **Before Fix:**
- Program Winners shows "No prize assigned" 
- Message: "Configure in Program Assignments"

✅ **After Fix:**
- Program Winners displays actual prize information
- Shows prize name, category, and value
- Green box with prize details for winners with assigned prizes
- "No prize assigned" only for placements that truly don't have prizes configured

## Testing the Fix

1. **Create a test scenario:**
   - Ensure you have a program with prize assignments (1st Place → Some Prize)
   - Add a winner for that program with 1st Place
   - Check the Program Winners page

2. **Expected result:**
   - Winner should now show the assigned prize information
   - Prize details should appear in a green box with gift icon

## Verification Query

To verify the fix worked, you can run this query in Supabase SQL Editor:

```sql
-- Check if prize assignments are properly linked to winners
SELECT 
    pw.student_name,
    pw.program_name,
    pw.placement,
    pw.prize_name,
    pw.prize_category
FROM program_winners_view pw
WHERE pw.prize_name IS NOT NULL
ORDER BY pw.program_name, pw.placement_order;
```

This should return rows showing winners with their assigned prizes.

## Rollback (If Needed)

If you need to revert this change, you can restore the original view:

```sql
-- Revert to original view (NOTE: This brings back the bug)
DROP VIEW IF EXISTS program_winners_view;

CREATE OR REPLACE VIEW program_winners_view AS
SELECT 
    pw.*,
    s.name as student_name,
    s.chest_no as student_chest_no,
    p.name as program_name,
    sec.name as section_name,
    sec.code as section_code,
    -- Prize information from program prize assignments
    ppa.id as prize_assignment_id,
    ppa.prize_id,
    ppa.quantity as prize_quantity,
    pr.name as prize_name,
    pr.image_url as prize_image_url,
    pr.category as prize_category,
    pr.description as prize_description,
    pr.average_value as prize_average_value,
    pc.name as prize_category_name,
    pc.description as prize_category_description
FROM program_winners pw
JOIN students s ON pw.student_id = s.id
JOIN programs p ON pw.program_id = p.id
JOIN sections sec ON p.section_id = sec.id
LEFT JOIN program_prize_assignments ppa ON (
    pw.program_id = ppa.program_id 
    AND pw.placement = ppa.placement
    AND ppa.user_id = pw.user_id
)
LEFT JOIN prizes pr ON ppa.prize_id = pr.id
LEFT JOIN prize_categories pc ON pr.category = pc.code AND pr.user_id = pc.user_id
WHERE pw.user_id = auth.uid();

GRANT SELECT ON program_winners_view TO authenticated;
```

## Notes

- **Data Safety**: This migration is safe and won't delete any data
- **Downtime**: No downtime expected for this view update
- **Performance**: The view performance should be similar or slightly better due to proper indexing
- **Compatibility**: No changes needed in the application code