-- ROBUST Fix for Program Winners Prize Display Issue
-- This migration addresses all potential causes of the "No prize assigned" issue

-- Step 1: Drop existing view
DROP VIEW IF EXISTS program_winners_view;

-- Step 2: Create temporary debug view to check data integrity
CREATE OR REPLACE VIEW debug_prize_join_check AS
SELECT 
    pw.id as winner_id,
    pw.program_id,
    pw.placement as winner_placement,
    pw.user_id,
    ppa.id as assignment_id,
    ppa.placement as assignment_placement,
    ppa.prize_id,
    -- Check for exact matches
    (pw.program_id = ppa.program_id) as program_match,
    (pw.placement = ppa.placement) as placement_match,
    (pw.user_id = ppa.user_id) as user_match,
    -- Show placement comparison details
    length(pw.placement) as winner_placement_length,
    length(ppa.placement) as assignment_placement_length,
    ascii(substr(pw.placement, 1, 1)) as winner_first_char_ascii,
    ascii(substr(ppa.placement, 1, 1)) as assignment_first_char_ascii
FROM program_winners pw
FULL OUTER JOIN program_prize_assignments ppa ON (
    pw.program_id = ppa.program_id 
    AND pw.placement = ppa.placement
    AND pw.user_id = ppa.user_id
)
WHERE pw.user_id = auth.uid() OR ppa.user_id = auth.uid();

-- Step 3: Create improved program_winners_view with better error handling
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
-- Use INNER JOINs for required relationships with explicit user_id checks
INNER JOIN students s ON (
    pw.student_id = s.id 
    AND s.user_id = pw.user_id
)
INNER JOIN programs p ON (
    pw.program_id = p.id 
    AND p.user_id = pw.user_id
)
INNER JOIN sections sec ON (
    p.section_id = sec.id 
    AND sec.user_id = pw.user_id
)
-- LEFT JOIN for prize assignments (optional relationship)
LEFT JOIN program_prize_assignments ppa ON (
    pw.program_id = ppa.program_id 
    AND TRIM(pw.placement) = TRIM(ppa.placement)  -- Trim whitespace
    AND ppa.user_id = pw.user_id
)
-- LEFT JOIN for prize details
LEFT JOIN prizes pr ON (
    ppa.prize_id = pr.id 
    AND pr.user_id = pw.user_id
)
-- LEFT JOIN for prize category details
LEFT JOIN prize_categories pc ON (
    pr.category = pc.code 
    AND pc.user_id = pw.user_id
)
WHERE pw.user_id = auth.uid();

-- Step 4: Grant permissions
GRANT SELECT ON program_winners_view TO authenticated;
GRANT SELECT ON debug_prize_join_check TO authenticated;

-- Step 5: Add helpful comments
COMMENT ON VIEW program_winners_view IS 'Shows program winners with their assigned prizes. If prize fields are NULL, check that: 1) Prize assignments exist for the exact program+placement combination, 2) Placement strings match exactly (check debug_prize_join_check view), 3) User authentication is working correctly.';

COMMENT ON VIEW debug_prize_join_check IS 'Debug view to troubleshoot prize assignment JOIN issues. Use this to check placement string matching and data integrity.';